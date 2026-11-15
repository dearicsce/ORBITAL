using System;
using System.Collections.Generic;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Orbital
{
    public sealed partial class OrbitalView
    {
        // JsonUtility fills these records from the reference geometry adapter.
#pragma warning disable 0649
        [Serializable] sealed class MeshMessage { public MeshScene payload; }
        [Serializable] sealed class MeshScene
        {
            public MeshRecord[] geometries;
            public MaterialRecord[] materials;
            public NodeRecord[] nodes;
            public float[] center;
            public float radius;
        }
        [Serializable] sealed class MeshRecord
        {
            public string id;
            public float[] positions, normals, uv;
            public int[] indices;
            public bool lines;
        }
        [Serializable] sealed class MaterialRecord
        {
            public string id, texture;
            public float[] color;
            public float metallic, roughness;
            public bool doubleSided;
            public bool unlit, depthTest;
            public float alpha;
        }
        [Serializable] sealed class NodeRecord
        {
            public string id, name, geometry, material;
            public float[] position, rotation, scale;
            public bool visible;
        }
#pragma warning restore 0649
        Transform referenceCraft;
        readonly Dictionary<string, Mesh> referenceMeshes = new Dictionary<string, Mesh>();
        readonly Dictionary<string, Material> referenceMaterials = new Dictionary<string, Material>();
        readonly Dictionary<string, GameObject> referenceNodes = new Dictionary<string, GameObject>();
        Vector3 referenceTarget;
        float referenceRadius = 2;
        Vector3 referenceCameraPosition;
        Quaternion referenceCameraRotation;
        float referenceCameraFov;

        public void SetReferenceMeshes(string json)
        {
            MeshScene scene = JsonUtility.FromJson<MeshMessage>(json)?.payload;
            if (scene?.geometries == null || scene.materials == null || scene.nodes == null || scene.nodes.Length > 5000
                || !float.IsFinite(scene.radius) || scene.radius < 0 || scene.radius > 100)
                throw new ArgumentException("Invalid reference mesh snapshot.");
            if (referenceCraft == null) referenceCraft = Root("Reference catalog assembly", hangar);
            foreach (MeshRecord record in scene.geometries)
            {
                if (record.positions == null || record.positions.Length % 3 != 0 || record.positions.Length > 3_000_000)
                    throw new ArgumentException("Invalid mesh vertices.");
                var vertices = MeshVectors(record.positions);
                int[] indices = record.indices?.Length > 0 ? record.indices : Sequential(vertices.Length);
                int stride = record.lines ? 2 : 3;
                if (indices.Length % stride != 0) throw new ArgumentException("Invalid primitive list.");
                foreach (int index in indices) if (index < 0 || index >= vertices.Length) throw new ArgumentException("Invalid triangle index.");
                if (!record.lines)
                    for (int i = 0; i < indices.Length; i += 3) (indices[i], indices[i + 2]) = (indices[i + 2], indices[i]);
                var mesh = new Mesh { name = record.id, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
                mesh.vertices = vertices;
                mesh.SetIndices(indices, record.lines ? MeshTopology.Lines : MeshTopology.Triangles, 0);
                if (record.normals?.Length == record.positions.Length) mesh.normals = MeshVectors(record.normals);
                else if (!record.lines) mesh.RecalculateNormals();
                if (record.uv?.Length == vertices.Length * 2)
                {
                    var uv = new Vector2[vertices.Length];
                    for (int i = 0; i < uv.Length; i++) uv[i] = new Vector2(record.uv[i * 2], record.uv[i * 2 + 1]);
                    mesh.uv = uv;
                }
                mesh.RecalculateBounds();
                if (referenceMeshes.TryGetValue(record.id, out Mesh oldMesh)) Object.Destroy(oldMesh);
                referenceMeshes[record.id] = mesh;
            }
            foreach (MaterialRecord record in scene.materials)
            {
                Vector3 color = MeshVector(record.color);
                var material = Material("Reference material " + record.id, 0xffffff, record.metallic, 1 - record.roughness);
                if (record.unlit)
                {
                    Shader shader = Resources.Load<Shader>("Workshop/ReferenceOverlay");
                    material.shader = shader != null ? shader : Shader.Find("Unlit/Color");
                    material.SetInt("_ZTest", (int)(record.depthTest ? UnityEngine.Rendering.CompareFunction.LessEqual : UnityEngine.Rendering.CompareFunction.Always));
                    material.renderQueue = record.depthTest ? 3000 : 4000;
                }
                material.color = new Color(color.x, color.y, color.z, record.alpha);
                if (!record.unlit && record.alpha < 1)
                {
                    material.SetFloat("_Mode", 2);
                    material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                    material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                    material.SetInt("_ZWrite", 0);
                    material.EnableKeyword("_ALPHABLEND_ON");
                    material.renderQueue = 3000;
                }
                if (record.doubleSided) material.SetInt("_Cull", (int)UnityEngine.Rendering.CullMode.Off);
                if (!string.IsNullOrEmpty(record.texture))
                {
                    var texture = new Texture2D(2, 2);
                    if (!texture.LoadImage(Convert.FromBase64String(record.texture))) throw new ArgumentException("Invalid presentation texture.");
                    material.mainTexture = texture;
                }
                if (referenceMaterials.TryGetValue(record.id, out Material oldMaterial)) DestroyReferenceMaterial(oldMaterial);
                referenceMaterials[record.id] = material;
            }
            var wanted = new HashSet<string>();
            var wantedMeshes = new HashSet<string>();
            var wantedMaterials = new HashSet<string>();
            foreach (NodeRecord record in scene.nodes)
            {
                wanted.Add(record.id);
                wantedMeshes.Add(record.geometry);
                wantedMaterials.Add(record.material);
                if (!referenceNodes.TryGetValue(record.id, out GameObject item))
                {
                    item = new GameObject(record.name);
                    item.transform.SetParent(referenceCraft, false);
                    item.AddComponent<MeshFilter>();
                    item.AddComponent<MeshRenderer>();
                    referenceNodes.Add(record.id, item);
                }
                item.GetComponent<MeshFilter>().sharedMesh = referenceMeshes[record.geometry];
                item.GetComponent<MeshRenderer>().sharedMaterial = referenceMaterials[record.material];
                item.SetActive(record.visible);
                Vector3 position = MeshVector(record.position);
                item.transform.localPosition = new Vector3(position.x, position.y, -position.z);
                item.transform.localScale = MeshVector(record.scale);
                float[] q = record.rotation;
                if (q?.Length != 4) throw new ArgumentException("Invalid mesh orientation.");
                item.transform.localRotation = new Quaternion(-q[0], -q[1], q[2], q[3]);
            }
            var removed = new List<string>();
            foreach (var pair in referenceNodes)
                if (!wanted.Contains(pair.Key))
                {
                    Object.Destroy(pair.Value);
                    removed.Add(pair.Key);
                }
            foreach (string id in removed) referenceNodes.Remove(id);
            ReleaseUnused(referenceMeshes, wantedMeshes, mesh => Object.Destroy(mesh));
            ReleaseUnused(referenceMaterials, wantedMaterials, DestroyReferenceMaterial);
            Vector3 center = MeshVector(scene.center);
            referenceTarget = new Vector3(center.x, center.y, -center.z);
            referenceRadius = Mathf.Max(.8f, scene.radius);
        }

        public int ReferenceMeshCount => referenceMeshes.Count;
        public int ReferenceNodeCount => referenceNodes.Count;

        public void SetReferenceCamera(float[] position, float[] rotation, float fov)
        {
            Vector3 p = MeshVector(position);
            if (rotation?.Length != 4 || !float.IsFinite(fov) || fov < 10 || fov > 100)
                throw new ArgumentException("Invalid presentation camera.");
            foreach (float coordinate in rotation)
                if (!float.IsFinite(coordinate)) throw new ArgumentException("Invalid camera rotation.");
            referenceCameraPosition = new Vector3(p.x, p.y, -p.z);
            // Reflect the source's right-handed camera and geometry across Z.
            // Unity's forward camera axis accounts for the view-space handedness.
            referenceCameraRotation = new Quaternion(-rotation[0], -rotation[1], rotation[2], rotation[3]);
            referenceCameraFov = fov;
        }

        public void ClearReferenceCraft()
        {
            if (referenceCraft != null) Object.Destroy(referenceCraft.gameObject);
            referenceCraft = null;
            referenceNodes.Clear();
            foreach (Mesh mesh in referenceMeshes.Values) Object.Destroy(mesh);
            referenceMeshes.Clear();
            foreach (Material material in referenceMaterials.Values) DestroyReferenceMaterial(material);
            referenceMaterials.Clear();
            referenceCameraFov = 0;
        }

        static void DestroyReferenceMaterial(Material material)
        {
            if (material.mainTexture != null) Object.Destroy(material.mainTexture);
            Object.Destroy(material);
        }

        static void ReleaseUnused<T>(Dictionary<string, T> resources, HashSet<string> wanted, Action<T> destroy)
        {
            var removed = new List<string>();
            foreach (var pair in resources)
                if (!wanted.Contains(pair.Key))
                {
                    destroy(pair.Value);
                    removed.Add(pair.Key);
                }
            foreach (string id in removed) resources.Remove(id);
        }

        static int[] Sequential(int count)
        {
            var result = new int[count];
            for (int i = 0; i < count; i++) result[i] = i;
            return result;
        }

        static Vector3[] MeshVectors(float[] coordinates)
        {
            var result = new Vector3[coordinates.Length / 3];
            for (int i = 0; i < result.Length; i++)
            {
                for (int axis = 0; axis < 3; axis++)
                    if (!float.IsFinite(coordinates[i * 3 + axis])) throw new ArgumentException("Nonfinite mesh coordinate.");
                result[i] = new Vector3(coordinates[i * 3], coordinates[i * 3 + 1], -coordinates[i * 3 + 2]);
            }
            return result;
        }

        static Vector3 MeshVector(float[] value)
        {
            if (value?.Length != 3) throw new ArgumentException("Expected three mesh coordinates.");
            foreach (float coordinate in value) if (!float.IsFinite(coordinate) || Mathf.Abs(coordinate) > 100) throw new ArgumentException("Invalid mesh coordinate.");
            return new Vector3(value[0], value[1], value[2]);
        }


        public void ShowReferenceCraft()
        {
            PrepareHangar();
            inSpace = false;
            hangar.gameObject.SetActive(true);
            earthSystem.gameObject.SetActive(false);
            fill.enabled = true;
            RenderSettings.ambientLight = ColorOf(0x424e60);
            sun.transform.rotation = Quaternion.Euler(35, -35, 0);
            camera.backgroundColor = ColorOf(0x142535);
            rocket.gameObject.SetActive(false);
            satellite.gameObject.SetActive(false);
            camera.fieldOfView = 36;
            if (referenceCraft == null) return;
            referenceCraft.gameObject.SetActive(true);
            if (referenceCameraFov > 0)
            {
                camera.fieldOfView = referenceCameraFov;
                camera.transform.SetPositionAndRotation(referenceCameraPosition, referenceCameraRotation);
            }
            else Frame(referenceTarget, referenceRadius * 3.5f * zoom, yaw + 180, pitch);
        }

        public string ReferenceThumbnail()
        {
            if (Texture == null) return null;
            camera.Render();
            RenderTexture before = RenderTexture.active;
            RenderTexture thumbnail = RenderTexture.GetTemporary(320, 200, 0);
            var pixels = new Texture2D(320, 200, TextureFormat.RGB24, false);
            try
            {
                Graphics.Blit(Texture, thumbnail);
                RenderTexture.active = thumbnail;
                pixels.ReadPixels(new Rect(0, 0, 320, 200), 0, 0);
                pixels.Apply();
                return Convert.ToBase64String(pixels.EncodeToPNG());
            }
            finally
            {
                RenderTexture.active = before;
                RenderTexture.ReleaseTemporary(thumbnail);
                Object.Destroy(pixels);
            }
        }
    }
}
