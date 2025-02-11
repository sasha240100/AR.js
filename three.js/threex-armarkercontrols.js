(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	} else {
		// Browser globals (root is window)
		if (!root.THREEx) root.THREEx = {};
		root.THREEx.ArMarkerControls = factory();
	}
}(this, function() {
	var ArMarkerControls = function(context, object3d, parameters){
		var _this = this
		this.context = context
		// handle default parameters
		this.parameters = {
			// size of the marker in meter
			size : parameters.debug !== undefined ? parameters.debug : 1,
			// type of marker - ['pattern', 'barcode', 'unknown' ]
			type : parameters.type !== undefined ? parameters.type : 'unknown',
			// url of the pattern - IIF type='pattern'
			patternUrl : parameters.patternUrl !== undefined ? parameters.patternUrl : null,
			// value of the barcode - IIF type='barcode'
			barcodeValue : parameters.barcodeValue !== undefined ? parameters.barcodeValue : null,
			// change matrix mode - [modelViewMatrix, cameraTransformMatrix]
			changeMatrixMode : parameters.changeMatrixMode !== undefined ? parameters.changeMatrixMode : 'modelViewMatrix',
		}

		// sanity check
		var possibleValues = ['pattern', 'barcode', 'unknown' ]
		console.assert(possibleValues.indexOf(this.parameters.type) !== -1, 'illegal value', this.parameters.type)
		var possibleValues = ['modelViewMatrix', 'cameraTransformMatrix' ]
		console.assert(possibleValues.indexOf(this.parameters.changeMatrixMode) !== -1, 'illegal value', this.parameters.changeMatrixMode)

		this.markerId = null

					// create the marker Root
		this.object3d = object3d
		this.object3d.name = 'Marker Root'
		this.object3d.matrixAutoUpdate = false;
		this.object3d.visible = false

		// add this marker to artoolkitsystem
		context.addMarker(this)

		// wait for arController to be initialized before going on with the init
		var delayedInitTimerId = setInterval(function(){
			// check if arController is init
			var arController = _this.context.arController
			if( arController === null )	return
			// stop looping if it is init
			clearInterval(delayedInitTimerId)
			delayedInitTimerId = null
			// launch the _postInit
			_this._postInit()
		}, 1000/50)
		return

	}

	ArMarkerControls.prototype._postInit = function(){
		var _this = this
		var markerObject3D = this.object3d;
		// check if arController is init
		var arController = this.context.arController
		console.assert(arController !== null )

		// start tracking this pattern
		if( _this.parameters.type === 'pattern' ){
									arController.loadMarker(_this.parameters.patternUrl, function(markerId) {
				_this.markerId = markerId
													arController.trackPatternMarkerId(_this.markerId, _this.parameters.size);
									});
		}else if( _this.parameters.type === 'barcode' ){
			_this.markerId = _this.parameters.barcodeValue
			arController.trackBarcodeMarkerId(_this.markerId, _this.parameters.size);
		}else if( _this.parameters.type === 'unknown' ){
			_this.markerId = null
		}else{
			console.log(false, 'invalid marker type', _this.parameters.type)
		}

		// listen to the event
		arController.addEventListener('getMarker', function(event){

			if( event.data.type === artoolkit.PATTERN_MARKER && _this.parameters.type === 'pattern' ){
				if( _this.markerId === null )	return
				if( event.data.marker.idPatt === _this.markerId ) onMarkerFound()
			}else if( event.data.type === artoolkit.BARCODE_MARKER && _this.parameters.type === 'barcode' ){
				// console.log('BARCODE_MARKER idMatrix', event.data.marker.idMatrix, _this.markerId )
				if( _this.markerId === null )	return
				if( event.data.marker.idMatrix === _this.markerId )  onMarkerFound()
			}else if( event.data.type === artoolkit.UNKNOWN_MARKER && _this.parameters.type === 'unknown'){
				onMarkerFound()
			}

			function onMarkerFound(){
				// mark object as visible
				markerObject3D.visible = true

				// data.matrix is the model view matrix
				var modelViewMatrix = new THREE.Matrix4().fromArray(event.data.matrix)

				// change markerObject3D.matrix based on parameters.changeMatrixMode
				if( _this.parameters.changeMatrixMode === 'modelViewMatrix' ){
					markerObject3D.matrix.copy(modelViewMatrix)
				}else if( _this.parameters.changeMatrixMode === 'cameraTransformMatrix' ){
					var cameraTransformMatrix = new THREE.Matrix4().getInverse( modelViewMatrix )
					markerObject3D.matrix.copy(cameraTransformMatrix)
				}else {
					console.assert(false)
				}

				// decompose the matrix into .position, .quaternion, .scale
				markerObject3D.matrix.decompose(markerObject3D.position, markerObject3D.quaternion, markerObject3D.scale)
			}
		})
	}

	ArMarkerControls.dispose = function(){
		this.context.removeMarker(this)

		// TODO remove the event listener if needed
		// unloadMaker ???
	}

	return ArMarkerControls;
}));
