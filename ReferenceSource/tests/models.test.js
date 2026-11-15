import { disposeObject } from '../js/three/sceneKit.js';

      import * as THREE from 'three';
      import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
      import { loadManifest, getModel, getHardpoints } from '../js/three/models.js';

      const viewport = document.getElementById('viewport');
      const select = document.getElementById('model-select');
      const readout = document.getElementById('bounds-readout');
      const jsonArea = document.getElementById('manifest-entry-json');
      const copyBtn = document.getElementById('btn-copy-json');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
      camera.position.set(5, 5, 8);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(viewport.clientWidth, viewport.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      viewport.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // Lights & Ground Grid
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const sun = new THREE.DirectionalLight(0xffffff, 2.0);
      sun.position.set(6, 10, 6);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x38bdf8, 0.6);
      fill.position.set(-6, 2, -6);
      scene.add(fill);

      const grid = new THREE.GridHelper(16, 32, 0x38bdf8, 0x1e2e4f);
      scene.add(grid);

      let currentModel = null;
      let manifest = {};
      let activeId = 'kestrel';
      let activeConfig = { file: null, targetHeight: 8.0, rotation: [0, 0, 0], offset: [0, 0, 0], credit: '' };

      function updateJsonOutput() {
        const payload = {};
        payload[activeId] = {
          file: activeConfig.file,
          targetHeight: Number(activeConfig.targetHeight.toFixed(2)),
          rotation: activeConfig.rotation.map((r) => ((r % 360) + 360) % 360),
          offset: activeConfig.offset,
          credit: activeConfig.credit || ''
        };
        const str = JSON.stringify(payload, null, 2);
        // Trim outer enclosing braces for clean manifest copy
        jsonArea.value = str.slice(str.indexOf('\n') + 1, str.lastIndexOf('\n'));
        readout.textContent = `Height: ${activeConfig.targetHeight.toFixed(2)} • Rot: [${activeConfig.rotation.join(', ')}]`;
      }

      async function displayModel(id) {
        if (currentModel) {
          scene.remove(currentModel);
          disposeObject(currentModel);
          currentModel = null;
        }
        activeId = id;
        activeConfig = {
          file: manifest[id]?.file || null,
          targetHeight: manifest[id]?.targetHeight || 1.0,
          rotation: [...(manifest[id]?.rotation || [0, 0, 0])],
          offset: [...(manifest[id]?.offset || [0, 0, 0])],
          credit: manifest[id]?.credit || ''
        };

        currentModel = await getModel(id);
        scene.add(currentModel);
        const names=[];currentModel.traverse(node=>{if(node.name)names.push(node.name);});
        document.getElementById('model-nodes').textContent='Nodes: '+names.join(', ')+(id.startsWith('bus_')?'\nHardpoints: '+JSON.stringify(await getHardpoints(id),null,2):'');

        // Adjust camera to fit target height
        const dist = Math.max(activeConfig.targetHeight * 1.5, 4.0);
        camera.position.set(dist * 0.7, activeConfig.targetHeight * 0.6, dist);
        controls.target.set(0, activeConfig.targetHeight / 2, 0);
        controls.update();

        updateJsonOutput();
      }

      function applyTransform() {
        if (!currentModel) return;
        currentModel.rotation.set(
          THREE.MathUtils.degToRad(activeConfig.rotation[0]),
          THREE.MathUtils.degToRad(activeConfig.rotation[1]),
          THREE.MathUtils.degToRad(activeConfig.rotation[2])
        );
        const originalH = manifest[activeId]?.targetHeight || 1.0;
        const scaleFactor = activeConfig.targetHeight / originalH;
        currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        updateJsonOutput();
      }

      // Event handlers
      document.getElementById('btn-rot-x-pos').onclick = () => { activeConfig.rotation[0] = (activeConfig.rotation[0] + 90) % 360; applyTransform(); };
      document.getElementById('btn-rot-x-neg').onclick = () => { activeConfig.rotation[0] = (activeConfig.rotation[0] - 90 + 360) % 360; applyTransform(); };
      document.getElementById('btn-rot-y-pos').onclick = () => { activeConfig.rotation[1] = (activeConfig.rotation[1] + 90) % 360; applyTransform(); };
      document.getElementById('btn-rot-y-neg').onclick = () => { activeConfig.rotation[1] = (activeConfig.rotation[1] - 90 + 360) % 360; applyTransform(); };
      document.getElementById('btn-rot-z-pos').onclick = () => { activeConfig.rotation[2] = (activeConfig.rotation[2] + 90) % 360; applyTransform(); };
      document.getElementById('btn-rot-z-neg').onclick = () => { activeConfig.rotation[2] = (activeConfig.rotation[2] - 90 + 360) % 360; applyTransform(); };

      document.getElementById('btn-scale-up').onclick = () => { activeConfig.targetHeight *= 1.1; applyTransform(); };
      document.getElementById('btn-scale-down').onclick = () => { activeConfig.targetHeight = Math.max(0.1, activeConfig.targetHeight * 0.9); applyTransform(); };

      copyBtn.onclick = () => {
        navigator.clipboard.writeText(jsonArea.value).then(() => {
          copyBtn.textContent = '✓ Copied to Clipboard!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy JSON Entry'; }, 1800);
        });
      };

      select.onchange = (e) => displayModel(e.target.value);

      window.addEventListener('resize', () => {
        camera.aspect = viewport.clientWidth / viewport.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
      });

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      // Initialization
      loadManifest().then((data) => {
        manifest = data;
        select.innerHTML = Object.keys(data).map((id) => `<option value="${id}">${id}</option>`).join('');
        displayModel('kestrel');
      });
    