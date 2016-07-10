const webglCanvas = document.body.appendChild(document.createElement('canvas'))
const fit = require('canvas-fit')
const regl = require('../regl')(webglCanvas)
const mat4 = require('gl-mat4')
const camera = require('canvas-orbit-camera')(webglCanvas)
window.addEventListener('resize', fit(webglCanvas), false)
const bunny = require('bunny')
const normals = require('angle-normals')

// configure intial camera view.
camera.rotate([0.0, 0.0], [0.0, -0.4])
camera.zoom(300.0)

function createStatsWidget (drawCalls) {
  // the widget keeps track of the previous values of gpuTime,
  // in order to compute the frame time.
  var prevGpuTimes = []
  var i
  for (i = 0; i < drawCalls.length; i++) {
    prevGpuTimes[i] = 0
  }

  // we update the widget every second, we need to keep track of the time:
  var totalTime = 1.1

  // we show the average frametime to the user.
  var N = 50
  var totalFrameTime = []
  var frameTimeCount = 0
  var avgFrameTime = []
  for (i = 0; i < drawCalls.length; ++i) {
    totalFrameTime[i] = 0.0
    avgFrameTime[i] = 0.0
  }

  // the widget is contained in a <div>
  var container = document.createElement('div')
  container.style.cssText = 'position:fixed;top:20px;left:20px;opacity:0.8;z-index:10000;'
  var pr = Math.round(window.devicePixelRatio || 1)

  // widget styling constants.
  var WIDTH = 160
  var TEXT_SIZE = 10
  var TEXT_START = [7, 37]
  var TEXT_SPACING = 6
  var HEADER_SIZE = 20
  var BOTTOM_SPACING = 20
  var HEADER_POS = [3, 3]
  var BG = '#000'
  var FG = '#ccc'
  var HEIGHT = drawCalls.length * TEXT_SIZE + (drawCalls.length - 1) * TEXT_SPACING + TEXT_START[1] + BOTTOM_SPACING

  // we draw the widget on a canvas.
  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d')

  // set canvas size
  canvas.width = WIDTH * pr
  canvas.height = HEIGHT * pr
  canvas.style.cssText = 'width:' + WIDTH + 'px;height:' + HEIGHT + 'px'

  // draw background.
  context.fillStyle = BG
  context.fillRect(0, 0, WIDTH * pr, HEIGHT * pr)

  // draw header.
  context.font = 'bold ' + (HEADER_SIZE * pr) + 'px Helvetica,Arial,sans-serif'
  context.textBaseline = 'top'
  context.fillStyle = FG
  context.fillText('Stats', HEADER_POS[0] * pr, HEADER_POS[1] * pr)

  container.appendChild(canvas)
  document.body.appendChild(container)

  return {
    update: function (deltaTime) {
      totalTime += deltaTime
      if (totalTime > 1.0) {
        totalTime = 0

        // make sure that we clear the old text before drawing new text.
        context.fillStyle = BG
        context.fillRect(
          TEXT_START[0] * pr,
          TEXT_START[1] * pr,
          (WIDTH - TEXT_START[0]) * pr,
          (HEIGHT - TEXT_START[1]) * pr)

        context.font = 'bold ' + (TEXT_SIZE * pr) + 'px Helvetica,Arial,sans-serif'
        context.fillStyle = FG

        var drawCall
        var str
        var textCursor = [TEXT_START[0], TEXT_START[1]]
        var frameTime
        for (var i = 0; i < drawCalls.length; i++) {
          drawCall = drawCalls[i]

          str = drawCall[1] + ' : ' + Math.round(100.0 * avgFrameTime[i]) / 100.0 + 'ms'
          context.fillText(str, textCursor[0] * pr, textCursor[1] * pr)

          // next line
          textCursor[1] += TEXT_SIZE + TEXT_SPACING
        }
      }

      frameTimeCount++
      // make sure to update the previous gpuTime, and to compute the average.
      for (i = 0; i < drawCalls.length; i++) {
        drawCall = drawCalls[i]

        frameTime = drawCall[0].stats.gpuTime - prevGpuTimes[i]
        totalFrameTime[i] += frameTime

        if (frameTimeCount === N) {
          avgFrameTime[i] = totalFrameTime[i] / N
          totalFrameTime[i] = 0.0
        }

        prevGpuTimes[i] = drawCall[0].stats.gpuTime
      }

      // reset avg calculation.
      if (frameTimeCount === N) {
        frameTimeCount = 0
      }
    }
  }
}

const planeElements = []
var planePosition = []
var planeNormal = []

planePosition.push([-0.5, 0.0, -0.5])
planePosition.push([+0.5, 0.0, -0.5])
planePosition.push([-0.5, 0.0, +0.5])
planePosition.push([+0.5, 0.0, +0.5])

planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])

planeElements.push([3, 1, 0])
planeElements.push([0, 2, 3])

// create box geometry

var boxPosition = [
  // side faces
  [-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5], // positive z face.
  [+0.5, +0.5, +0.5], [+0.5, +0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], // positive x face
  [+0.5, +0.5, -0.5], [-0.5, +0.5, -0.5], [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], // negative z face
  [-0.5, +0.5, -0.5], [-0.5, +0.5, +0.5], [-0.5, -0.5, +0.5], [-0.5, -0.5, -0.5], // negative x face.
  [-0.5, +0.5, -0.5], [+0.5, +0.5, -0.5], [+0.5, +0.5, +0.5], [-0.5, +0.5, +0.5],  // top face
  [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]  // bottom face
]

const boxElements = [
  [2, 1, 0], [2, 0, 3],
  [6, 5, 4], [6, 4, 7],
  [10, 9, 8], [10, 8, 11],
  [14, 13, 12], [14, 12, 15],
  [18, 17, 16], [18, 16, 19],
  [20, 21, 22], [23, 20, 22]
]

// all the normals of a single block.
var boxNormal = [
  // side faces
  [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0],
  [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0],
  [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0],
  // top
  [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0],
  // bottom
  [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0]
]

function createModel (position, scale) {
  var m = mat4.identity([])

  mat4.translate(m, m, position)

  var s = scale
  mat4.scale(m, m, [s, s, s])
  return m
}

/*
  This function encapsulates all the common state
  */
const scope1 = regl({
  cull: {
    enable: true
  },
  uniforms: {
    // View Projection matrices.
    view: () => camera.view(),
    projection: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
                       Math.PI / 4,
                       viewportWidth / viewportHeight,
                       0.01,
                       2000),

    // light settings. These can of course by tweaked to your likings.
    lightDir: [0.39, 0.87, 0.29],
    ambientLightAmount: 0.3,
    diffuseLightAmount: 0.7
  },
  frag: `
  precision mediump float;
  varying vec3 vNormal;
  uniform vec3 lightDir;
  uniform float ambientLightAmount;
  uniform float diffuseLightAmount;
  uniform vec3 color;
  void main () {
    vec3 tex = color;
    vec3 ambient = ambientLightAmount * tex;
    vec3 diffuse = diffuseLightAmount * tex * clamp( dot(vNormal, lightDir ), 0.0, 1.0 );
    gl_FragColor = vec4(ambient + diffuse, 1.0);
  }`,
  vert: `
  // the size of the world on the x and z-axes.
  precision mediump float;
  attribute vec3 position;
  attribute vec3 normal;
  varying vec3 vPosition;
  varying vec3 vNormal;
  uniform mat4 projection, view, model;
  void main() {
    vPosition = position;
    vNormal = normal;
    gl_Position = projection * view * model * vec4(position, 1);
  }`,
  enableGpuTimer: true
})

// we make the light darker in this scope.
const scope2 = regl({
  uniforms: {
    ambientLightAmount: 0.15,
    diffuseLightAmount: 0.35
  },
  enableGpuTimer: false
})

const scope3 = regl({
  uniforms: {
    ambientLightAmount: 0.90,
    diffuseLightAmount: 0.70
  },
  enableGpuTimer: true
//  enableGpuTimer: true
})

const drawPlane = regl({

  uniforms: {
    color: [0.7, 0.7, 0.7],
    model: (_, props, batchId) => {
      return createModel(props.position, props.scale)
    }
  },
  attributes: {
    position: planePosition,
    normal: planeNormal

  },
  elements: planeElements
})

const drawBunny = regl({
  attributes: {
    position: bunny.positions,
    normal: normals(bunny.cells, bunny.positions)
  },
  elements: bunny.cells,
  uniforms: {
    model: (_, props, batchId) => {
      return createModel(props.position, props.scale)
    },
    color: [0.5, 0.0, 0.0]
  },
})

const drawBox = regl({
  attributes: {
    position: boxPosition,
    normal: boxNormal
  },
  elements: boxElements,
  uniforms: {
    model: (_, props, batchId) => {
      return createModel(props.position, props.scale)
    },
    color: [0.0, 0.6, 0.0]
  },
  enableGpuTimer: true
})

var drawCalls = [
  [drawPlane, 'drawPlane'],
  [drawBunny, 'drawBunny'],
  [drawBox, 'drawBox'],
  [scope1, 'scope1'],
  [scope2, 'scope2'],
  [scope3, 'scope3']
]
var statsWidget = createStatsWidget(drawCalls)

regl.frame(() => {
  regl.updateTimer()

  regl.clear({
    color: [0, 0, 0, 255],
    depth: 1
  })

  const deltaTime = 0.017

  statsWidget.update(deltaTime)

  scope1({}, () => {
    var boxes = []
    var x
    var z
    var X_COUNT = 5
    var Z_COUNT = 5

    // place out boxes.
    var SPACING = -100
    for (x = 0; x < X_COUNT; x++) {
      for (z = 0; z < Z_COUNT; z++) {
        boxes.push({scale: 50.7, position: [-200.0 + x * SPACING, 40, 200 + z * SPACING]})
      }
    }

    scope2({}, () => {
      drawBox(boxes)
    })

    // place out bunnies
    SPACING = 100
    var bunnies = []
    for (x = 0; x < X_COUNT; x++) {
      for (z = 0; z < Z_COUNT; z++) {
        bunnies.push({scale: 5.2, position: [x * SPACING, 3.3, -80.0 + z * SPACING]})
      }
    }

    scope3({}, () => {
      drawPlane({scale: 2000.0, position: [0.0, 0.0, 0.0]})
      drawBunny(bunnies)
    })

    camera.tick()
  })
})
