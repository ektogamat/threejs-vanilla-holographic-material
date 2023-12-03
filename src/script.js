import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  BloomEffect,
  BrightnessContrastEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  VignetteEffect
} from 'postprocessing'

import HolographicMaterial from './HolographicMaterialVanilla.js'

const dracoLoader = new DRACOLoader()
const loader = new GLTFLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
dracoLoader.setDecoderConfig({ type: 'js' })
loader.setDRACOLoader(dracoLoader)

/**
 * Scene
 */
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/**
 * ScreenResolution
 */
const screenRes = {
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize', () => {
  screenRes.width = window.innerWidth
  screenRes.height = window.innerHeight

  camera.aspect = screenRes.width / screenRes.height
  camera.updateProjectionMatrix()

  renderer.setSize(screenRes.width, screenRes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  35,
  screenRes.width / screenRes.height,
  0.1,
  1000
)
camera.position.set(0, 0, 5)
scene.add(camera)

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.maxDistance = 6
controls.minDistance = 2
controls.maxPolarAngle = Math.PI / 1.7
controls.minPolarAngle = 1.1

/**
 * Lights
 */
const light = new THREE.DirectionalLight()
light.intensity = 1
light.position.set(-20, 20, 50)
scene.add(light)

const ambientLight = new THREE.AmbientLight()
ambientLight.intensity = 2.9
scene.add(ambientLight)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  powerPreference: 'high-performance',
  antialias: false,
  stencil: false,
  depth: false
})
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.toneMapping = THREE.LinearToneMapping
renderer.toneMappingExposure = 0.7
renderer.setSize(screenRes.width, screenRes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))

/**
 * SkyBox
 */
const geometry = new THREE.SphereGeometry(8, 40, 40)
const texture = new THREE.TextureLoader().load('background.jpg')
texture.flipY = true
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide
})

const skyBox = new THREE.Mesh(geometry, material)
scene.add(skyBox)
skyBox.rotation.y = -1

/**
 * KyloRen Helmet
 */
let KyloRen
const holoMaterial1 = new HolographicMaterial({
  hologramColor: '#00d5ff',
  fresnelAmount: 0.7,
  blendMode: THREE.NormalBlending,
  scanlineSize: 3.7,
  signalSpeed: 0.18,
  hologramOpacity: 0.7,
  blinkFresnelOnly: true,
  depthTest: true,
  hologramBrightness: 1.6
})

const holoMaterial2 = new HolographicMaterial({
  hologramColor: '#00ffaa',
  fresnelAmount: 0.6,
  blendMode: THREE.NormalBlending,
  scanlineSize: 30,
  signalSpeed: 1,
  blinkFresnelOnly: true,
  hologramOpacity: 0.5,
  hologramBrightness: 2,
  depthTest: false
})
loader.load('kylo_rens_helmet-transformed.glb', function (gltf) {
  KyloRen = gltf.scene

  const hologramMesh = KyloRen.children

  hologramMesh[0].material = holoMaterial1
  hologramMesh[1].material = holoMaterial2
  hologramMesh[2].material = holoMaterial1

  scene.add(KyloRen)
  hologramMesh[1].scale.set(0.315, 0.315, 0.315)

  KyloRen.position.set(0, 0, -1.5)
  KyloRen.scale.set(1.6, 1.6, 1.6)
})

/**
 * Set up the GUI for manipulating parameters
 */

const gui = new dat.GUI()

// Add controls for each parameter
gui
  .add(holoMaterial1.uniforms.fresnelOpacity, 'value')
  .min(0)
  .max(1)
  .step(0.01)
  .name('Fresnel Opacity')
gui
  .add(holoMaterial1.uniforms.fresnelAmount, 'value')
  .min(0)
  .max(2)
  .step(0.01)
  .name('Fresnel Amount')
gui
  .add(holoMaterial1.uniforms.scanlineSize, 'value')
  .min(0)
  .max(20)
  .step(0.01)
  .name('Scanline Size')
gui
  .add(holoMaterial1.uniforms.hologramBrightness, 'value')
  .min(0)
  .max(2)
  .step(0.01)
  .name('Hologram Brightness')
gui
  .add(holoMaterial1.uniforms.signalSpeed, 'value')
  .min(0)
  .max(2)
  .step(0.01)
  .name('Signal Speed')
gui
  .addColor(
    {
      HologramColor: holoMaterial1.uniforms.hologramColor.value.getStyle()
    },
    'HologramColor'
  )
  .onChange((color) => {
    holoMaterial1.uniforms.hologramColor.value.setStyle(color)
    holoMaterial1.needsUpdate = true
  })
gui.add(holoMaterial1.uniforms.enableBlinking, 'value').name('Enable Blinking')
gui
  .add(holoMaterial1.uniforms.blinkFresnelOnly, 'value')
  .name('Blink Fresnel Only')
gui
  .add(holoMaterial1.uniforms.hologramOpacity, 'value')
  .min(0)
  .max(1)
  .step(0.01)
  .name('Hologram Opacity')

/**
 * Post processing
 */
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(
  new EffectPass(
    camera,
    new DepthOfFieldEffect(camera, { focusRange: 0.048, focalLength: 0.4, bokehScale: 80 })
  )
)
composer.addPass(
  new EffectPass(
    camera,
    new BloomEffect({
      luminanceThreshold: 0.6,
      intensity: 1.2,
      mipmapBlur: true,
      radius: 0.8
    })
  )
)
composer.addPass(
  new EffectPass(
    camera,
    new BloomEffect({
      luminanceThreshold: 0.2,
      intensity: 0.6,
      mipmapBlur: true,
      radius: 1
    })
  )
)
composer.addPass(
  new EffectPass(
    camera,
    new BrightnessContrastEffect({
        contrast: 0.2
    })
  )
)
composer.addPass(
  new EffectPass(
    camera,
    new SMAAEffect()
  )
)
composer.addPass(new EffectPass(camera, new VignetteEffect({ darkness: 0.7 })))

/**
 * Animate
 */
const clock = new THREE.Clock()
const tick = () => {
  controls.update()
  composer.render()
  holoMaterial1.update()
  holoMaterial2.update()

  if (KyloRen) {
      KyloRen.position.y = Math.sin(clock.getElapsedTime()) / 8.3
  }

  window.requestAnimationFrame(tick)
}

tick()
