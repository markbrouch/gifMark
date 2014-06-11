
// var superGif = new RubbableGif({
// 	gif: document.getElementById('test-gif'),
// 	rubbable: true,
// 	autoplay: false
// });
// superGif.load(function() {
// 	console.log('gif loaded', superGif);
// 	console.log(superGif.get_length());
// });

// $('#test2').gifMark().claunchPad();

$('canvas').on('touchStart', function() {
	console.log('start');
	$(this).trigger('pause');
});
$('canvas').on('touchEnd', function() {
	$(this).trigger('play');
});
$('canvas').on('swiping', function(e, data) {
	$(this).trigger('moveRelative', data.xC - data.xP);
});

var xhr = new XMLHttpRequest();
// xhr.open('GET', 'img/test.gif', true);
xhr.open('GET', 'img/test2.gif', true);
xhr.responseType = 'arraybuffer';
xhr.onload = function(e) {
	if(this.status === 200) {

		var dec2hex = function(dec) {
			var hex = dec.toString(16).toUpperCase();
			return (hex.length === 1) ? "0x0" + hex : "0x" + hex;
		};

		var logByteArr = function(bytes) {
			var byteArr = [];
			for(var i = 0, len = bytes.length; i < len; i++) {
				byteArr.push(dec2hex(bytes[i]));
			}
			console.log(byteArr);
		};

		var bits2num = function (ba) {
			return ba.reduce(function (s, n) {
				return s * 2 + n;
			}, 0);
		};

		var dec2bits = function (dec) {
			var a = [];
			for (var i = 7; i >= 0; i--) {
				a.push( !! (dec & (1 << i)));
			}
			return a;
		};

		var Gif = function(buffer) {
			var _this = this;
			var bytes = new Uint8ClampedArray(buffer);
			var bytePos;

			var unsigned = function(bytes) {
				return (bytes[1] << 8) | bytes[0];
			};

			var bytes2string = function(byteArray) {
				var string = "";
				for(var i = 0, len = byteArray.length; i < len; i++) {
					string += String.fromCharCode(byteArray[i]);
				}
				return string;
			};

			var parseExt = function(startPos) {
				if(bytes[startPos] === 33) {
					var label = bytes[startPos + 1];
					var size = bytes[startPos + 2];
					var block = bytes.subarray(startPos, startPos + size + 3);
					var subblocks = [];
					var parseSubblocks = function(startPos) {
						if(bytes[startPos] !== 0) {
							var size = bytes[startPos];
							subblocks.push({
								size  : size,
								block : bytes.subarray(startPos, startPos + bytes[startPos] + 1)
							});
							parseSubblocks(startPos + size);
						} else {
							if(subblocks.length > 0) {
								lastSubblock = subblocks[subblocks.length - 1];
								block = bytes.subarray(block.byteOffset, lastSubblock.block.byteOffset + lastSubblock.block.byteLength + 1);
							}
						}
					};
					parseSubblocks(block.byteOffset + block.byteLength);

					switch(label) {
						case 255:
							_this.blocks.ext.push({
								type  : 'Application Extension',
								block : block,
								data  : subblocks,
								size  : size,
								id    : bytes2string(block.subarray(3, 11)),
								code  : block.subarray(11, 14)
							});
							return block.byteOffset + block.byteLength;
						case 249:
							_this.blocks.ext.push({
								type            : 'Graphic Control Extension',
								block           : block,
								size            : size,
								disposalMethod  : (block[3] << 3 & 255) >> 5,
								userInputFlag   : (block[3] & 2) ? true : false,
								transColorFlag  : (block[3] & 1) ? true : false,
								delayTime       : unsigned(block.subarray(4, 6)),
								transColorIndex : block[6]
							});
							return block.byteOffset + block.byteLength + 1;
						case 1:	// TODO: Finish this extension
							_this.blocks.ext.push({
								type     : 'Plain Text Extension',
								block    : block,
								data     : subblocks,
								size     : size,
								textGrid : {
									left   : unsigned(block.subarray(3, 5)),
									top    : unsigned(block.subarray(5, 7)),
									width  : unsigned(block.subarray(7, 9)),
									height : unsigned(block.subarray(9, 11))
								}
							});
							return block.byteOffset + block.byteLength;
						default:
							return false;
					}
				} else {
					return false;
				}
			};

			var parseImg = function(startPos) {
				if(bytes[startPos] === 44) {
					var img = {};
					var descriptorBlock = bytes.subarray(startPos, startPos + 10);
					var lctSize = (descriptorBlock[9] << 5 & 255) >> 5;
					img.descriptor = {
						block         : descriptorBlock,
						left          : unsigned(descriptorBlock.subarray(1, 3)),
						top           : unsigned(descriptorBlock.subarray(3, 5)),
						width         : unsigned(descriptorBlock.subarray(5, 7)),
						height        : unsigned(descriptorBlock.subarray(7, 9)),
						lctFlag       : (descriptorBlock[9] & 128) ? true : false,
						interlaceFlag : (descriptorBlock[9] & 64) ? true : false,
						sortFlag      : (descriptorBlock[9] & 32) ? true : false,
						lctSize       : (lctSize === 0) ? 0 : 3 * Math.pow(2, lctSize + 1)
					};
					var dataStart = startPos + 10;
					if(img.descriptor.lctFlag) {
						img.lct = bytes.subarray(startPos + 10, startPos + 10 + img.descriptor.lctSize);
						dataStart += img.descriptor.lctSize;
					}
					img.data = {
						lzwMinSize: bytes[dataStart]
					};
					dataStart++;

					var lzwDecode = function(data) {
						var pos = 0;
						var readCode = function (size) {
							var code = 0;
							for (var i = 0; i < size; i++) {
								if (data[pos >> 3] & (1 << (pos & 7))) {
									code |= 1 << i;
								}
								pos++;
							}
							return code;
						};

						var colorTable = (img.descriptor.lctFlag) ? img.lct : _this.blocks.gct;
						var pixelArray = new Uint8ClampedArray(4 * img.descriptor.width * img.descriptor.height);
						var pixel = 0;
						var pixelArray2 = [];

						var clearCode = 1 << img.data.lzwMinSize;
						var eoiCode = clearCode + 1;

						var codeSize = img.data.lzwMinSize + 1;

						var dict = [];

						var clear = function () {
							dict = [];
							codeSize = img.data.lzwMinSize + 1;
							for (var i = 0; i < clearCode; i++) {
								dict[i] = [i];
							}
							dict[clearCode] = [];
							dict[eoiCode] = null;

						};

						var code;
						var last;

						var ctLookup = function(index) {
							var opacity = 255;
							if(index === 8) opacity = 0;
							index *= 3;
							return [colorTable[index], colorTable[index + 1], colorTable[index + 2], opacity];
						};

						var flatten = function(a, b) {
							return a.concat(b);
						};

						while (true) {
							last = code;
							code = readCode(codeSize);

							if (code === clearCode) {
								clear();
								continue;
							}
							if (code === eoiCode) break;

							if (code < dict.length) {
								if (last !== clearCode) {
									dict.push(dict[last].concat(dict[code][0]));
								}
							}
							else {
								if (code !== dict.length) throw new Error('Invalid LZW code.');
								dict.push(dict[last].concat(dict[last][0]));
							}
							pixelArray2 = pixelArray2.concat(dict[code]);
							var pixels = dict[code].map(ctLookup).reduce(flatten);
							pixelArray.set(pixels, pixel);
							pixel += dict[code].length * 4;

							if (dict.length === (1 << codeSize) && codeSize < 12) {
								// If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
								codeSize++;
							}
						}
						console.log('pixelArray:', pixelArray2);

						return pixelArray;
					};

					var lzwData = [];
					while(bytes[dataStart] !== 0) {
						var size = bytes[dataStart];
						dataStart++;
						lzwData = lzwData.concat(Array.apply([], bytes.subarray(dataStart, dataStart + size)));
						dataStart += size;
						console.log(lzwData);
					}
					img.data.pixelData = lzwDecode(lzwData);
					_this.blocks.img.push(img);
					return dataStart + 1;
				} else {
					return false;
				}
			};

			var parseBlock = function(startPos) {
				var blockCode = bytes[startPos];
				switch(blockCode) {
					case 33:
						bytePos = parseExt(startPos);
						return true;
					case 44:
						bytePos = parseImg(startPos);
						return true;
					case 59:
						bytePos = false;
						return false;
					default:
						return false;
				}
			};

			this.bytes = bytes;
			this.blocks = {
				hdr: bytes.subarray(0, 6),
				lsd: bytes.subarray(6, 13),
				ext: [],
				img: []
			};
			this.header = {
				width            : unsigned(this.blocks.lsd.subarray(0, 2)),
				height           : unsigned(this.blocks.lsd.subarray(2, 4)),
				hasGCT           : (this.blocks.lsd[4] & 128) ? true : false,
				sort             : (this.blocks.lsd[4] & 8) ? true : false,
				colorResolution  : (this.blocks.lsd[4] << 1 & 255) >> 5,
				gctSize          : 3 * Math.pow(2, ((this.blocks.lsd[4] << 5 & 255) >> 5) + 1),
				bgColorIndex     : this.blocks.lsd[5],
				pixelAspectRatio : this.blocks.lsd[6]
			};
			this.blocks.gct = bytes.subarray(13, 13 + this.header.gctSize);

			bytePos = 13 + this.blocks.gct.byteLength;
			// while(bytePos) {
			while(this.blocks.img.length < 1) {
				console.log(parseBlock(bytePos));
			}
		};

		window.gif = new Gif(xhr.response);

		console.log("gif:", gif);

		for(var i = 0, len = gif.blocks.gct.length; i < len; i += 3) {
			var r = gif.blocks.gct[i];
			var g = gif.blocks.gct[i + 1];
			var b = gif.blocks.gct[i + 2];
			var span = document.createElement('span');
			$(span).css({
				'width': '10px',
				'height': '10px',
				'display': 'block',
				'float': 'left',
				'background-color': 'rgb(' + r + ', ' + g + ', ' + b + ')'
			});
			$('#gct').append(span);
		}

		var setImageData = function(canvas, gif, frame) {
			var tempCanvas = document.createElement('canvas');
			tempCanvas.width = canvas.width;
			tempCanvas.height = canvas.height;
			var tempCtx = tempCanvas.getContext('2d');
			var ctx = canvas.getContext('2d');
			frame = gif.blocks.img[frame];
			var imageData = tempCtx.createImageData(frame.descriptor.width, frame.descriptor.height);
			imageData.data.set(frame.data.pixelData);
			tempCtx.putImageData(imageData, frame.descriptor.left, frame.descriptor.top);
			ctx.drawImage(tempCanvas, 0, 0);
		};

		var canvas = document.createElement('canvas');
		canvas.width = gif.header.width;
		canvas.height = gif.header.height;
		setImageData(canvas, gif, 0);
		$('body').append(canvas);
	}
};
xhr.send();