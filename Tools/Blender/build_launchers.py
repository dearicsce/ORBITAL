
"""Generate editable Blender models and staged glTF assets for ORBITAL.

Run: blender -b --factory-startup --python Tools/Blender/build_launchers.py
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
EXPORT = ROOT / "Tools" / "EmbeddedUI" / "launcher-models"
EXPORT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

# Z is up in Blender. The glTF exporter maps it to Y in the game.
# All profile heights and nozzle exit offsets are local to their flight part.
MODELS = [
    dict(id="kestrel", mark="K9", radius=.83, core=11.3, upper=2.7, fair_r=1.06,
         fair_h=3.65, engines=5, boosters=0, style="reusable", accent="A7B8C4", shell="E3E5DF"),
    dict(id="condor", mark="C5", radius=1.13, core=10.9, upper=2.9, fair_r=1.38,
         fair_h=4.35, engines=3, boosters=2, style="tank", accent="98563F", shell="E2E2D3"),
    dict(id="albatross", mark="A1", radius=.89, core=12.3, upper=3.45, fair_r=1.43,
         fair_h=4.65, engines=1, boosters=0, style="solid", accent="536D75", shell="D3DFDD"),
    dict(id="roc", mark="R4", radius=1.42, core=12.45, upper=3.6, fair_r=1.80,
         fair_h=5.2, engines=5, boosters=4, style="tank", accent="B97943", shell="DAD6C3"),
    dict(id="skylark", mark="S1", radius=.62, core=8.3, upper=2.1, fair_r=.78,
         fair_h=2.55, engines=1, boosters=0, style="light", accent="938142", shell="E7E2CF"),
    dict(id="meridian", mark="M3", radius=1.06, core=10.3, upper=3.2, fair_r=1.40,
         fair_h=4.1, engines=3, boosters=0, style="wide", accent="427584", shell="DBE3DF"),
    dict(id="vanguard", mark="V7", radius=1.27, core=12.1, upper=3.75, fair_r=1.66,
         fair_h=4.75, engines=7, boosters=2, style="reusable", accent="A64E39", shell="DCDCD1"),
    dict(id="sprint", mark="SP2", radius=.69, core=10.8, upper=2.8, fair_r=.96,
         fair_h=3.55, engines=3, boosters=0, style="reusable", accent="D7C29D", shell="303A43"),
    dict(id="asterion", mark="AT6", radius=1.20, core=11.4, upper=3.4, fair_r=1.58,
         fair_h=4.9, engines=3, boosters=2, style="tank", accent="BA7447", shell="D9D6C8"),
    dict(id="leviathan", mark="LV8", radius=1.62, core=13.2, upper=4.1, fair_r=2.05,
         fair_h=5.8, engines=9, boosters=4, style="wide", accent="44657C", shell="DCE3E2"),
]


def material(name, hex_color, roughness, metalness=0):
    def linear(channel):
        return channel / 12.92 if channel < .04045 else ((channel + .055) / 1.055) ** 2.4

    rgba = tuple(linear(int(hex_color[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1,)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metalness
    return mat


CARBON = material("Charcoal insulation", "242A30", .77)
ALLOY = material("Machined aluminium", "7E8B90", .38, .68)
ENGINE = material("Inconel nozzle", "596467", .39, .72)
HEAT = material("Nozzle heat shielding", "60514A", .56, .44)
CERAMIC = material("Booster ceramic", "DFDED2", .66)
INK = material("Black stencil", "182128", .74)
PAINT = material("White stencil", "EDEDE6", .74)


def object_in(obj, collection, parent):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = parent
    return obj


def anchor(collection, name, parent=None, location=(0, 0, 0), **data):
    obj = object_in(bpy.data.objects.new(name, None), collection, parent)
    obj["flightNode"] = name
    obj.location = location
    for key, value in data.items():
        obj[key] = value
    return obj


def lathe(collection, parent, name, rings, materials, *, start=0, span=math.tau, count=48):
    # Ring entries contain z, radius and the material index of the next strip.
    full = abs(span - math.tau) < 1e-6
    columns = count if full else count + 1
    vertices = [(radius * math.cos(start + span * i / count),
                 radius * math.sin(start + span * i / count), z)
                for z, radius, _ in rings for i in range(columns)]
    faces = []
    indices = []
    for row in range(len(rings) - 1):
        for i in range(count):
            a = row * columns + i
            b = row * columns + ((i + 1) % columns)
            faces.append((a, b, b + columns, a + columns))
            indices.append(rings[row][2])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for mat in materials:
        mesh.materials.append(mat)
    for polygon, index in zip(mesh.polygons, indices):
        polygon.use_smooth = True
        polygon.material_index = index
    return object_in(bpy.data.objects.new(name, mesh), collection, parent)


def collar(collection, parent, label, z, radius, height, mat, count=48):
    return lathe(collection, parent, label,
                 [(z, radius * .98, 0), (z + .02, radius, 0),
                  (z + height - .02, radius, 0), (z + height, radius * .98, 0)],
                 [mat], count=count)


def detail(collection, parent, label, location, size, mat, angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = object_in(bpy.context.object, collection, parent)
    obj.name = label
    obj.location = location
    obj.scale = size
    obj.rotation_euler.z = angle
    obj.data.materials.append(mat)
    return obj


def marking(collection, parent, label, value, radius, z, angle, size, mat):
    data = bpy.data.curves.new(label, "FONT")
    data.body = value
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    obj = object_in(bpy.data.objects.new(label, data), collection, parent)
    obj.location = (radius * math.sin(angle), -radius * math.cos(angle), z)
    obj.rotation_euler = (math.pi / 2, 0, angle)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")


def nozzle(collection, parent, name, part, x, y, z, radius, length):
    bell = anchor(collection, name, parent, (x, y, z),
                  flightEngineId=part, nozzleExitY=-length, nozzleRadius=radius)
    contour = [(-length + t * length, radius * (1 - .73 * t ** .75), 0)
               for t in (i / 14 for i in range(15))]
    lathe(collection, bell, "Machined bell", contour, [ENGINE], count=24)
    # Separate rolled lip and a smaller reverse surface show the hollow exit.
    collar(collection, bell, "Exit lip", -length - .016, radius * 1.018, .055, HEAT, 24)
    inner = [(z_, radius_ * .94, idx) for z_, radius_, idx in reversed(contour)]
    lathe(collection, bell, "Bell liner", inner, [HEAT], count=24)
    collar(collection, bell, "Gimbal housing", -.075, radius * .42, .19, ALLOY, 24)


def tanks(collection, parent, label, radius, length, body, accent, style):
    insulation = 0 if style != "tank" else 1
    lathe(collection, parent, label,
          [(0, radius * .71, 2), (.21, radius * .91, 2), (.54, radius, 0),
           (length * .17, radius, insulation), (length * .72, radius, insulation),
           (length * .81, radius, 0), (length * .91, radius, 2),
           (length * .97, radius * .94, 2), (length + .29, radius * .91, 0)],
          [body, accent, CARBON])
    for z in (.55, length * .18, length * .54, length * .81, length * .92):
        collar(collection, parent, "Tank weld or joint", z, radius * 1.014, .055, ALLOY)
    for z in (length * .22, length * .75):
        collar(collection, parent, "Stage paint band", z, radius * 1.005, .19, accent)
    detail(collection, parent, "Propellant raceway", (radius, 0, length * .52),
           (radius * .10, radius * .20, length * .65), CARBON)
    for i in range(12):
        a = math.tau * i / 12
        detail(collection, parent, "Interstage reinforcement",
               (radius * .99 * math.cos(a), radius * .99 * math.sin(a), length * .88),
               (.06, .08, length * .071), ALLOY, a)
    if style == "reusable":
        for i in range(4):
            a = math.tau * i / 4 + math.pi / 4
            ca, sa = math.cos(a), math.sin(a)
            detail(collection, parent, "Folded landing leg", (ca * radius * 1.045, sa * radius * 1.045, 1.22),
                   (radius * .17, radius * .30, 1.55), CARBON, a)
            detail(collection, parent, "Stowed grid fin", (ca * radius * 1.09, sa * radius * 1.09, length * .78),
                   (radius * .24, radius * .44, .21), ALLOY, a)


def build(spec):
    key = spec["id"]
    col = bpy.data.collections.new(key.capitalize())
    bpy.context.scene.collection.children.link(col)
    root = anchor(col, "Launcher " + key, launcherModel=key)
    shell = material(key + " ceramic coat", spec["shell"], .53, .05)
    accent = material(key + " livery", spec["accent"], .52, .08)
    r, core_h, upper_h = spec["radius"], spec["core"], spec["upper"]
    lower = anchor(col, "stage_lower", root, flightPartId="core")
    tanks(col, lower, "First stage tanks", r, core_h, shell, accent, spec["style"])
    angles = [0, math.pi]
    for a in angles:
        marking(col, lower, "Stage designation", spec["mark"], r * 1.02, core_h * .68, a,
                r * .64, PAINT if spec["style"] == "tank" else INK)
    count = spec["engines"]
    offsets = [(0, 0)] if count % 2 and count != 3 else []
    ring_count = count - len(offsets)
    offsets.extend((r * .55 * math.cos(a), r * .55 * math.sin(a))
                   for a in (math.tau * (i + .25) / ring_count for i in range(ring_count)))
    for i, (x, y) in enumerate(offsets):
        nozzle(col, lower, "Core bell " + str(i + 1), "core", x, y, .12,
               r * (.50 if count == 1 else .23), r * (.89 if count == 1 else .55))

    upper = anchor(col, "stage_upper", root, (0, 0, core_h), flightPartId="upper")
    upper_r = r * (1.23 if spec["style"] == "solid" else .91)
    lathe(col, upper, "Upper stage tank",
          [(-.13, upper_r * .88, 1), (.26, upper_r, 1), (.48, upper_r, 0),
           (upper_h * .78, upper_r, 0), (upper_h * .94, upper_r * .78, 1),
           (upper_h + .08, upper_r * .76, 1)], [shell, ALLOY])
    collar(col, upper, "Upper stage identification", upper_h * .69, upper_r * 1.01, .24, accent)
    nozzle(col, upper, "Upper vacuum bell", "upper", 0, 0, .19, upper_r * .63, .77)
    adapter = anchor(col, "payload_adapter", upper, (0, 0, upper_h + .10))
    collar(col, adapter, "Payload interface", -.15, upper_r * .57, .22, ALLOY)

    fr, fh = spec["fair_r"], spec["fair_h"]
    taper = .60 if spec["style"] == "wide" else .52 if spec["style"] == "solid" else .45
    profile = [(-.19, upper_r * .80), (.20, fr), (fh * .18, fr), (fh * taper, fr),
               (fh * .65, fr * .93), (fh * .83, fr * .65), (fh * .95, fr * .28), (fh, .018)]
    for i, side in enumerate(("left", "right")):
        fairing = anchor(col, "fairing_" + side, root, (0, 0, core_h + upper_h + .06),
                         flightPartId="fairing-" + side)
        split = .009
        start = i * math.pi + split
        span = math.pi - 2 * split
        lathe(col, fairing, "Painted shell " + side,
              [(z, radius, 1 if j in (1, 5) else 0) for j, (z, radius) in enumerate(profile)],
              [shell, accent], start=start, span=span, count=32)
        lathe(col, fairing, "Shell liner " + side,
              [(z, radius * .965, 0) for z, radius in reversed(profile)],
              [CARBON], start=start, span=span, count=32)
        fairing["fairingProfile"] = [entry for point in profile for entry in point]
        angle = 0 if side == "right" else math.pi
        marking(col, fairing, "Mission branding", "ORBITAL", fr * 1.012, fh * .27, angle, fr * .26, INK)

    for i in range(spec["boosters"]):
        a = math.tau * (i + .125) / spec["boosters"]
        br, bh = r * .42, core_h * .72
        arm = r + br * 1.35
        part = "booster-" + str(i)
        booster = anchor(col, "booster_" + str(i), lower,
                         (arm * math.cos(a), arm * math.sin(a), .28), flightPartId=part)
        lathe(col, booster, "Solid motor casing",
              [(0, br * .69, 1), (.35, br, 0), (bh * .24, br, 0), (bh * .73, br, 0),
               (bh, br, 2), (bh + .50, br * .76, 2), (bh + 1.35, .015, 0)],
              [CERAMIC, CARBON, accent], count=32)
        for z in (bh * .24, bh * .56, bh * .73):
            collar(col, booster, "Casing joint", z, br * 1.025, .09, ALLOY, 32)
        for z in (1.2, bh * .84):
            detail(col, booster, "Separation attachment", (-.7 * br * math.cos(a), -.7 * br * math.sin(a), z),
                   (br * 1.25, .15, .14), ALLOY, a)
        nozzle(col, booster, "Booster bell", part, 0, 0, .18, br * .61, .67)
    return col, root


models = [(spec, *build(spec)) for spec in MODELS]
for spec, collection, root in models:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(EXPORT / (spec["id"] + ".glb")), export_format="GLB",
                             use_selection=True, export_extras=True, export_apply=True)

# The editable source opens as a spaced lineup. Each exported model is centered.
for index, (_, _, root) in enumerate(models):
    root.location.x = (index - (len(models)-1)/2) * 6.5
    root.rotation_euler.z = math.radians(-12)
bpy.ops.object.select_all(action="DESELECT")
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        region = area.spaces.active.region_3d
        region.view_location = Vector((0, 0, 9.5))
        region.view_distance = 43
        # Region rotation is a quaternion, generated from the view direction.
        region.view_rotation = Vector((-.12, 1, -.15)).to_track_quat('-Z', 'Y')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "Tools" / "Blender" / "ORBITAL-Launchers.blend"))
