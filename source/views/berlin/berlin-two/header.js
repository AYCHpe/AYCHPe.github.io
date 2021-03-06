var Nanocomponent = require('nanocomponent')
var PIXI = require('pixi.js')
var DotFilter = require('@pixi/filter-dot').DotFilter
var DisplacementFilter = PIXI.filters.DisplacementFilter
var html = require('choo/html')
var css = require('sheetify')
var pm = require('popmotion')
var xtend = require('xtend')

var styles = css`
  :host > canvas {
    display: block;
    position: absolute;
  }
`

module.exports = class Header extends Nanocomponent {
  constructor (name, state, emit) {
    super()
    this.state = state
    this.emit = emit
    this.local = {
      v: { x: 0, y: 0 },
      src: ''
    }

    this.handleResize = this.handleResize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
  }

  load (element) {
    var self = this

    // setup
    if (!this.app) {
      var size = element.getBoundingClientRect()
      // app
      var app = this.app = new PIXI.Application({
        height: Math.ceil(size.height),
        width: Math.ceil(size.width)
      })
      // layers
      var layerOne = self.layerOne = new PIXI.Container()
      var layerTwo = self.layerTwo = new PIXI.Container()
      // brush
      var brush = self.brush = new PIXI.Graphics()
      brush.beginFill(0xffff00)
      brush.drawCircle(0, 0, 20)
      brush.endFill()
      var renderTexture = self.renderTexture = PIXI.RenderTexture.create(app.screen.width, app.screen.height)
      var renderTextureSprite = self.renderTextureSprite = new PIXI.Sprite(renderTexture)
      renderTextureSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY 
      app.stage.interactive = true
      app.stage.on('pointermove', pointerMove)
      // filter
      var dotFilter = new DotFilter()
      dotFilter.scale = 2
      dotFilter.angle = 45
      //displace
      self.displacementSprite = PIXI.Sprite.fromImage(this.local.displacement)
      var displacementFilter = new DisplacementFilter(self.displacementSprite)
      self.displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT
      // filters
      layerOne.filters = [displacementFilter, dotFilter]
      app.stage.addChild(layerOne)
      app.stage.addChild(layerTwo)
    } else {
      this.app.start()
    }

    // smoothing
    var smooth = pm.transform.transformMap({
      x: pm.transform.smooth(4000),
      y: pm.transform.smooth(4000)
    })

    // initial position
    this.posx = window.innerWidth / 2
    this.posy = window.innerHeight / 2

    // mouse movement smoothing
    this.activeAction = pm.everyFrame().start(function () {
      var v = smooth(getXY())
      if (!self.image || !self.displacementSprite) return
      self.image.x = (v.x) * -1 * 2
      self.image.y = (v.y) * -1 * 5
      self.displacementSprite.x += 1
    })

    // load image
    if (!self.image || !self.displacementSprite) {
      PIXI.loader
        .add('bunny', this.local.src)
        .load(function (loader, resources) {
        self.image = new PIXI.Sprite(resources.bunny.texture)
        self.image.x = window.innerWidth / 2
        self.image.y = window.innerHeight / 2
        self.image.height = window.innerHeight * 6
        self.image.width = window.innerWidth * 3
        self.layerOne.addChild(self.image)
        self.layerOne.addChild(self.displacementSprite)
        self.layerTwo.addChild(self.renderTextureSprite)
      })
    }

    // listeners
    window.addEventListener('resize', this.handleResize, false)
    window.addEventListener('mousemove', this.handleMouseMove, false)
    this.rerender()

    function pointerMove (event) {
      self.brush.position.copy(event.data.global)
      self.app.renderer.render(self.brush, self.renderTexture, false, null, false)
    }

    function getXY () {
      return ({ x: self.posx, y: self.posy })
    }
  }

  unload (element) {
    if (this.activeAction) this.activeAction.stop()
    if (this.pointerTracker) this.pointerTracker.stop()
    if (!this.app) app.stop()
    window.removeEventListener('resize', this.handleResize, false)
    window.removeEventListener('mousemove', this.handleMouseMove, false)
  }

  handleResize () {
    var size = this.element.getBoundingClientRect()
    this.image.height = window.innerHeight * 6
    this.image.width = window.innerWidth * 3
    this.app.renderer.autoResize = true
    this.renderTexture.resize(size.width, size.height)
    this.app.renderer.resize(size.width, size.height)
  }

  handleMouseMove (event) {
    this.posx = event.clientX
    this.posy = event.clientY
  }

  createElement (props) {
    this.local = xtend(this.local, props)

    return html`
      <div class="psa t0 l0 r0 b0 ${styles}">
        ${this.app ? this.app.view : ''}
      </div>
    `
  }

  update (props) {
    return false
  }
}
