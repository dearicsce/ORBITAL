using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

public static class OrbitalBuild
{
    const string Scene = "Assets/Scenes/Orbital.unity";
    const string Player = "Build-Current/ORBITAL.exe";

    [MenuItem("ORBITAL/Play Game", false, 0)]
    public static void PlayGame()
    {
        string root = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
        string executable = Path.Combine(root, Player);
        if (!File.Exists(executable))
        {
            Debug.LogError("Build the current game using ORBITAL > Build Windows Player first.");
            return;
        }
        // The full campaign requires a standalone Windows window for its
        // embedded surface. Editor Play Mode runs the separate native mode.
        var start = new System.Diagnostics.ProcessStartInfo(executable)
        {
            WorkingDirectory = Path.GetDirectoryName(executable),
            UseShellExecute = false
        };
        string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ORBITAL", "Current", "Profile");
        start.EnvironmentVariables["ORBITAL_PROFILE_DIR"] = profile;
        start.EnvironmentVariables["ORBITAL_EXPORT_DIR"] = Path.Combine(profile, "Exports");
        start.EnvironmentVariables["ORBITAL_WEB_UI"] = "1";
        try { System.Diagnostics.Process.Start(start); }
        catch (Exception error) { Debug.LogError("Could not open ORBITAL: " + error.Message); }
    }

    [MenuItem("ORBITAL/Play Game", true)]
    static bool CanPlayGame() => !EditorApplication.isCompiling && !BuildPipeline.isBuildingPlayer;

    public static void VerifyAndBuild()
    {
        EngineeringVerification.Run();
        BuildWindows();
    }

    [MenuItem("ORBITAL/Build Windows Player")]
    public static void BuildWindows()
    {
        Directory.CreateDirectory("Assets/Scenes");
        if (!File.Exists(Scene))
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), Scene);
        }
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(Scene, true) };
        IncludeRuntimeShaders();
        PlayerSettings.companyName = "ORBITAL";
        PlayerSettings.productName = "ORBITAL";
        PlayerSettings.defaultScreenWidth = 1280;
        PlayerSettings.defaultScreenHeight = 720;
        PlayerSettings.fullScreenMode = FullScreenMode.FullScreenWindow;
        PlayerSettings.runInBackground = true;
        PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64, new[] { GraphicsDeviceType.Direct3D11 });
        string output = Environment.GetEnvironmentVariable("ORBITAL_BUILD_PATH") ?? Player;
        var report = BuildPipeline.BuildPlayer(new[] { Scene }, output,
            BuildTarget.StandaloneWindows64, BuildOptions.StrictMode);
        if (report.summary.result != BuildResult.Succeeded)
            throw new InvalidOperationException("Windows build failed: " + report.summary.result);
        Debug.Log("ORBITAL Windows build succeeded.");
    }

    static void IncludeRuntimeShaders()
    {
        var settings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
        SerializedProperty shaders = settings.FindProperty("m_AlwaysIncludedShaders");
        foreach (string name in new[] { "Standard", "Unlit/Color" })
        {
            Shader shader = Shader.Find(name);
            if (shader == null) throw new InvalidOperationException("Missing runtime shader " + name);
            bool included = false;
            for (int i = 0; i < shaders.arraySize; i++)
                included |= shaders.GetArrayElementAtIndex(i).objectReferenceValue == shader;
            if (included) continue;
            int index = shaders.arraySize;
            shaders.InsertArrayElementAtIndex(index);
            shaders.GetArrayElementAtIndex(index).objectReferenceValue = shader;
        }
        settings.ApplyModifiedPropertiesWithoutUndo();
        AssetDatabase.SaveAssets();
    }
}
