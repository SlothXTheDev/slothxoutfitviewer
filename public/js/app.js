import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const canvasMount = document.getElementById("canvasMount");
const shirtInput = document.getElementById("shirtInput");
const pantsInput = document.getElementById("pantsInput");
const clearShirtBtn = document.getElementById("clearShirt");
const clearPantsBtn = document.getElementById("clearPants");
const resetViewBtn = document.getElementById("resetView");
const screenshotBtn = document.getElementById("screenshot");
const showGridCb = document.getElementById("showGrid");
const lockCameraCb = document.getElementById("lockCamera");
const ambientSlider = document.getElementById("ambient");
const sunSlider = document.getElementById("sun");
const ambientVal = document.getElementById("ambientVal");
const sunVal = document.getElementById("sunVal");

let scene, camera, renderer, controls;
let grid, hemi, ambient, dirLight;
let avatar;
let shirtTargets = [];
let pantsTargets = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1116);

  const w = canvasMount.clientWidth;
  const h = canvasMount.clientHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(0.8, 1.2, 2.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  canvasMount.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.8, 0);

  ambient = new THREE.AmbientLight(0xffffff, parseFloat(ambientSlider.value));
  scene.add(ambient);

  hemi = new THREE.HemisphereLight(0x445566, 0x080820, 0.2);
  scene.add(hemi);

  dirLight = new THREE.DirectionalLight(0xffffff, parseFloat(sunSlider.value));
  dirLight.position.set(2, 3.5, 2.5);
  dirLight.castShadow = false;
  scene.add(dirLight);

  grid = new THREE.GridHelper(4, 40, 0x2a2f3a, 0x2a2f3a);
  grid.position.y = 0;
  scene.add(grid);

  window.addEventListener("resize", onResize);

  loadAvatar();

  showGridCb.addEventListener("change", () => grid.visible = showGridCb.checked);
  lockCameraCb.addEventListener("change", () => {
    controls.enabled = !lockCameraCb.checked;
  });

  ambientSlider.addEventListener("input", () => {
    ambient.intensity = parseFloat(ambientSlider.value);
    ambientVal.textContent = ambient.intensity.toFixed(2);
  });
  sunSlider.addEventListener("input", () => {
    dirLight.intensity = parseFloat(sunSlider.value);
    sunVal.textContent = dirLight.intensity.toFixed(2);
  });

  shirtInput.addEventListener("change", (e) => handleTextureUpload(e, "shirt"));
  pantsInput.addEventListener("change", (e) => handleTextureUpload(e, "pants"));
  clearShirtBtn.addEventListener("click", () => clearTexture("shirt"));
  clearPantsBtn.addEventListener("click", () => clearTexture("pants"));

  resetViewBtn.addEventListener("click", resetView);
  screenshotBtn.addEventListener("click", saveScreenshot);
}

function onResize() {
  const w = canvasMount.clientWidth;
  const h = canvasMount.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function loadAvatar() {
  const loader = new GLTFLoader();
  loader.load(
    "public/models/r15.glb",
    (gltf) => {
      avatar = gltf.scene;
      avatar.scale.set(0.25, 0.25, 0.25);
      avatar.position.set(0, 0, 0);
      avatar.rotation.y = Math.PI;
      scene.add(avatar);
      avatar.traverse((o) => {
        if (o.isMesh) console.log("MESH:", o.name);
      });

      const shirtNames = [
        "UpperTorso", "LowerTorso",
        "LeftUpperArm", "LeftLowerArm", "LeftHand",
        "RightUpperArm", "RightLowerArm", "RightHand"
      ];
      const pantsNames = [
        "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
        "RightUpperLeg", "RightLowerLeg", "RightFoot"
      ];

      avatar.traverse((obj) => {
        if (obj.isMesh) {
          obj.material = new THREE.MeshStandardMaterial({
            color: 0xbfc5d1,
            metalness: 0.0,
            roughness: 0.95
          });
          if (shirtNames.includes(obj.name)) shirtTargets.push(obj);
          if (pantsNames.includes(obj.name)) pantsTargets.push(obj);
        }
      });
    },
    undefined,
    (err) => {
      console.error("Failed to load r15.glb. Place your model at public/models/r15.glb", err);
      const msg = document.createElement("div");
      msg.style.position = "absolute";
      msg.style.top = "10px";
      msg.style.right = "10px";
      msg.style.background = "rgba(200,50,70,0.14)";
      msg.style.border = "1px solid rgba(200,50,70,0.4)";
      msg.style.padding = "8px 10px";
      msg.style.borderRadius = "8px";
      msg.textContent = "Missing model: place r15.glb under public/models/";
      canvasMount.appendChild(msg);
    }
  );
}

function handleTextureUpload(e, type) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.type !== "image/png") {
    alert("Please upload a PNG image.");
    return;
  }
  const url = URL.createObjectURL(file);
  const texLoader = new THREE.TextureLoader();
  texLoader.load(url, (tex) => {
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    applyClothingTexture(type, tex);
  });
}

function applyClothingTexture(type, texture) {
  const targets = (type === "shirt") ? shirtTargets : pantsTargets;
  targets.forEach((mesh) => {
    const mat = mesh.material.clone();
    mat.map = texture;
    mat.needsUpdate = true;
    mesh.material = mat;
  });
}

function clearTexture(type) {
  const targets = (type === "shirt") ? shirtTargets : pantsTargets;
  targets.forEach((mesh) => {
    const mat = mesh.material.clone();
    mat.map = null;
    mat.needsUpdate = true;
    mesh.material = mat;
  });
  if (type === "shirt") shirtInput.value = "";
  if (type === "pants") pantsInput.value = "";
}

function resetView() {
  controls.target.set(0, 0.8, 0);;
  camera.position.set(0.8, 1.2, 2.2);
  controls.update();
}


function saveScreenshot() {
  const link = document.createElement("a");
  link.download = "preview.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const workspace = document.querySelector('.workspace');

toggleSidebarBtn?.addEventListener('click', () => {
  const closing = !sidebar.classList.contains('closed');
  sidebar.classList.toggle('closed', closing);
  workspace.classList.toggle('collapsed', closing);
  toggleSidebarBtn.setAttribute('aria-pressed', String(!closing));
  setTimeout(onResize, 50);
});
