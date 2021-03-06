/**!

	jQPlayer - HTML 5 Video Player Plugin for jQuery
	Version: 0.5
	Site: http://jqplayer.vebersol.net/
	
	Author: Vinícius Ebersol
	Designer: Thiago Reis
	
	License: MIT License
	
*/
var options;
(function ($) {
	/**
	 * Provides a custom HTML5 video player.
	 *
	 * @class VideoPlayer
	 * @param  {jQueryObject} selector The jquery selector where video player will append to.
	 * @param  {Object} options  Options to customize jQPlayer
	 */
	var VideoPlayer = function (selector, options) {
		/**
		 * jQuery object that contain element to append the custom video element.
		 * 
		 * @property selector
		 * @type {jQueryObject}
		 */
		this.selector = selector;
		/**
		 * Options to customize jQPlayer.
		 * 
		 * @property options
		 * @type {Object}
		 */
		this.options = options;
		/**
		 * A flag to detect if video is playing or not.
		 * 
		 * @property playing
		 * @type {Boolean}
		 * @default  false
		 */
		this.playing = false;
		/**
		 * A flag that will determine if browser supports HTML5 video.
		 * 
		 * @property supportHTML5
		 * @type {Boolean}
		 * @default true
		 */
		this.supportHTML5 = true;
		/**
		 * A flag that will determine that poster isn't visible. True when this option is available.
		 * 
		 * @property options
		 * @type {Object}
		 */
		this.posterVisible = false;
		this.init();
	};

	VideoPlayer.prototype = {
		/**
		 * Video Player constructor that verifies if the browser can play HTML5 video and starts it, otherwise, it will load flash fallback (if browser has flash installed).
		 *
		 * @method  init
		 */
		init: function () {
			var videoEl = document.createElement('video');
			if (videoEl.canPlayType) {
				this.supportHTML5 = true;
				return this.start();
			}
			else {
				this.supportHTML5 = false;
				var hasFlash = false;
				try {
					var activeX = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
					if (activeX) {
						hasFlash = true;
					}
				} catch (e) {
					if (navigator.mimeTypes["application/x-shockwave-flash"] != undefined) {
						hasFlash = true;
					}
				}

				if (hasFlash) {
					this.startFallback();
				}
			}
		},

		/**
		 * Start HTML5 version of jQPlayer
		 *
		 * @method  start
		 */
		start: function () {
			this.getDefaultVideo();
			this.createVideoElement();
			this.createControls();
			this.bindControls();
			this.bindEvents();
			this.setupSubtitles();

			if (this.options.onStart) {
				this.options.onStart.call();
			}
		},

		/**
		 * Start flash version of jQPlayer (only browser that can't play HTML5 video)
		 *
		 * @method startFallback
		 */
		startFallback: function () {
			var _this = this;

			this.supportHTML5 = false;
			this.getDefaultVideo();
			this.createFlashElement();
			this.createControls();
			this.bindControls();
			this.bindEvents();
			this.setupSubtitles();

			if (this.options.onStart) {
				this.options.onStart.call();
			}
		},

		/**
		 * Method that will show the correct subtitle when video is seeked or version has been changed.
		 *
		 * @method  adjustSubtitle
		 * @param  {HTMLElement} video Current video element
		 */
		adjustSubtitle: function (video) {
			this.subtitleObj.count = 0;
			this.subtitleObj.current = this.subtitleObj.content[this.subtitleObj.count];

			var videoTime = this.supportHTML5 ? video.currentTime : video.currentTime(),
				currentTime = parseFloat(videoTime);

			while (this.getMaxTime() < currentTime) {
				this.updateSubtitle(video);

				if (this.subtitleObj.count > this.subtitleObj.content.length - 1) {
					this.subtitleObj.count = this.subtitleObj.content.length - 1;
					break;
				}
			}
		},

		/**
		 * Detect available controls set in options and add events to each of them.
		 *
		 * @method bindControls
		 */
		bindControls: function () {
			var _this = this;
			
			for (var i = 0; i < this.options.controls.length; i++) {
				switch (this.options.controls[i]) {
					case 'play':
						this.selector.find(_this.getClass('play')).bind('click', function () { _this.playPause(); });
						break;
					case 'progress':
						this.setupProgressBar();
						break;
					case 'volume':
						this.selector.find(_this.getClass('volume-button')).bind('click', function () {	_this.muteVideo(); });
						break;
					case 'fullscreen':
						this.selector.find(_this.getClass('fullscreen')).bind('click', function () { _this.toFullscreen(); });
						break;
					default:
						break;
				}
			}
		},

		/**
		 * Handle events or custom flash events
		 * 
		 * @method bindEvents
		 */
		bindEvents: function () {
			var _this = this;
			var video = this.video.get(0);

			if (this.supportHTML5) {
				video.addEventListener('loadedmetadata', function () {
					_this.eventsToBind();				
				}, true);
				
				if ($.browser.webkit) {
					$(document).bind('webkitfullscreenchange', function () {
						_this.fullscreenEvent();
					});
				}
				else if ($.browser.mozilla) {
					$(document).bind('mozfullscreenchange', function () {
						_this.fullscreenEvent();
					});
				}
			}
			else {
				$(document).bind('flash.loaded', function () {
					_this.eventsToBind();
				});
			}
			
			var enter = function () {
				$(this).addClass('hover');
			};
			
			var leave = function () {
				var element = $(this);
				if (element.hasClass(_this.getClass('volume').replace('.', '')) && _this.volumeFlag) {
					return false;
				}

				element.removeClass('hover');
			};
			
			$(this.getClass('play')).hover(enter, leave);
			$(this.getClass('volume')).hover(enter, leave);
			$(this.getClass('fullscreen')).hover(enter, leave);
			$(this.getClass('alternative-versions')).hover(enter, leave);

			this.selector.bind('mouseleave', function (ev) {
				ev.preventDefault();
				if (_this.playing) {
					clearTimeout(_this.inactivateTimer);
					_this.inactivateTimer = setTimeout(function () {
						_this.selector.find(_this.getClass('video-controls')).addClass('inactive');
					}, 2000);
				}
			});
			
			this.selector.bind('mouseenter', function (ev) {
				ev.preventDefault();
				clearTimeout(_this.inactivateTimer);
				_this.selector.find(_this.getClass('video-controls')).removeClass('inactive');
			});

			this.selector.find(this.getClass('video-controls')).bind('mousedown', function (ev) {
				ev.preventDefault();
			});

			$(window).bind('resize', function () {
				_this.setupProgressBar();
			});
		},
		
		/**
		 * Prevent native text/element selection when using progress bar or volume bar.
		 *
		 * @method  blockSelection
		 */
		blockSelection: function () {
			this.volumeFlag = true;
			document.onselectstart = function () {
				return false;
			};
		},
		
		/**
		 * Change video to an alternative quality/version.
		 *
		 * @method changeVideoSource
		 * @param  {HTMLElement} element The version element inside the versions list button.
		 */
		changeVideoSource: function (element) {
			var currentVersionEl = $(element).parent().parent().parent();
			currentVersion = currentVersionEl.attr('class').replace(this.setClass('alternative-versions') + ' ', '');
			var labelEl = currentVersionEl.find(this.getClass('current-version'));
			var alternative = $(element).parent().attr('class').replace('.' + this.options.prefix + 'alternative-', '');
			
			if (currentVersion != alternative) {
				var version = this.options.videos[alternative];
				
				labelEl.html(version.label);
				labelEl.parent().removeClass(currentVersion).addClass(alternative);

				video = this.video.get(0);
				if (this.supportHTML5) {
					video.pause();
				}
				else {
					video._pause();
				}
			
				this.resetVideo();

				if (this.supportHTML5) {
					video.src = this.getVideoSource(version);
				}
				else {
					video.changeVideo(this.getVideoSource(version));
				}
				
				var ul = $(this.getClass('alternative-versions')).find('ul');
				ul.html('');
				
				for (alternative in this.options.videos) {
					var alternativeObj = this.options.videos[alternative];
					if (alternativeObj != version) {
						if (alternativeObj.source) {
							var li = $('<li class="'+this.getClass('alternative-' + alternative)+'"><a href="javascript:;"><span></span></a></li>');
							if (alternativeObj.label) {
								li.find('span').html(alternativeObj.label);
							}

							var _this = this;
							li.find('a').bind('click', function () { _this.changeVideoSource(this); });
							
							ul.append(li);
						}
					}
				}
			
				var _this = this;

				if (this.supportHTML5) {
					video.addEventListener('loadedmetadata', function () {
						this.play();
					
						if (_this.options.onVideoChange) {
							_this.options.onVideoChange.call();
						}
					
					}, true);
				}
			}
		},
		
		/**
		 * Create the alternative videos button with elements select.
		 * 
		 * @method  createAlternative
		 * @return {jQueryObject} Alternative selector button HTML.
		 */
		createAlternative: function () {
			var element = $('<div class="'+ this.setClass('alternative-versions') +'"></div>');
			element.append('<span class="'+this.setClass('current-version')+'">'+this.defaultVideo.label+'</span>');
			element.append('<ul></ul>');
			
			for (alternative in this.options.videos) {
				var alternativeObj = this.options.videos[alternative];
				
				if (alternativeObj != this.defaultVideo) {
					if (alternativeObj.source) {
						var li = $('<li class="'+this.getClass('alternative-' + alternative)+'"><a href="javascript:;"><span></span></a></li>');
						if (alternativeObj.label) {
							li.find('span').html(alternativeObj.label);
						}

						var _this = this;
						li.find('a').bind('click', function () { _this.changeVideoSource(this); });
					
						element.find('ul').append(li);
					}
				}
				else {
					element.addClass(alternative);
				}
			}
			
			return element;
		},
		
		/**
		 * Create a button in control bar.
		 *
		 * @method  createButton
		 * @param  {String} labelName The label name to provide text inside the button.
		 * @param  {String} className A class to add to this button.
		 * @return {jQueryObject} The custom button.
		 */
		createButton: function (labelName, className) {
			var btn = $('<div>').addClass(this.setClass(className));
			var label = $('<span>').html(labelName);
			btn.append(label);
			
			return btn;
		},
		
		/**
		 * Create an element to break float elements, it should be provided in order to be supported by older browsers. :(
		 *
		 * @method  createClearFloats
		 * @return {String} An string that contain the HTML markup to be inserted somewhere in control bar.
		 */
		createClearFloats: function () {
			return '<div style="clear:both;width:0;height:0;margin:0;padding:0;"><!-- --></div>';
		},
		
		/**
		 * Creates control bar and check options to verify which controls should be created inside this progress bar.
		 *
		 * @method  createControls
		 */
		createControls: function () {
			this.controls = $('<div>').addClass(this.setClass(this.options.controlsClass));
			
			for (var i = 0; i < this.options.controls.length; i++) {
				switch (this.options.controls[i]) {
					case 'play':
						var playBtn = this.createButton('Play/Pause', 'play');
						this.controls.append(playBtn);
						break;
					case 'progress':
						var progressBar = this.createProgressBar();
						this.controls.append(progressBar);
						break;
					case 'time':
						var timeDisplay = this.createTimeDisplay();
						this.controls.append(timeDisplay);
						break;
					case 'volume':
						var volumeBar = this.createVolumeBar();
						this.controls.append(volumeBar);
						break;
					case 'fullscreen':
						if ($.browser.webkit || $.browser.mozilla) {
							var fullScreenBtn = this.createButton('Fullscreen', 'fullscreen');
							this.controls.append(fullScreenBtn);
						}
						break;
					case 'alternative':
						var alternative = this.createAlternative();
						this.controls.append(alternative);
						break;
					default:
						var customButton = this.createCustomButton(this.options.controls[i]);
						this.controls.append(customButton);
						break;
				}
			}
			
			// clear floats
			this.controls.append(this.createClearFloats());
			this.selector.append(this.controls);
		},
		
		/**
		 * Creates a custom buttons that has been provided by user in options.
		 *
		 * @method  createCustomButton
		 * @param {String} button button index to get button object.
		 * @return {jQueryObject} Custom button element.
		 */
		createCustomButton: function (button) {
			var buttonElement = null;
			var buttonObj = this.options.customButtons[button];
			/**
			 * @property {Object} button
			 *	        		@param {String} button.label A text to put inside the custom button
			 *			@param {String} button.className A class to add in custom button element
			 *			@param {String} [button.url] An URL to put in link target.
			 *			@param {String} [button.target] The target window when url is available. Ex.: _blank, _self, _parent
			 *			@param {Function} [button.onclick] A function to be executed on click. If url is set, this option won't be applied.
			 */
			if (buttonObj) {
				if (buttonObj.url) {
					buttonElement = $('<div><a href="'+buttonObj.url+'"></a></div>');
					
					if (buttonObj.label)
						buttonElement.find('a').html(buttonObj.label);
						
					if (buttonObj.className) {
						buttonElement.addClass(buttonObj.className);
					}
						
					if (buttonObj.target) {
						buttonElement.find('a').attr('target', buttonObj.target);
					}
				}
				else if (buttonObj.onclick) {
					buttonElement = $('<div><a href="javascript:;"></a></div>');
					buttonElement.find('a').bind('click', buttonObj.onclick);
					
					if (buttonObj.className)
						buttonElement.addClass(buttonObj.className);
						
					if (buttonObj.label)
						buttonElement.find('a').html(buttonObj.label);
				}
				
				buttonElement.addClass(this.setClass('custom-button'));
				return buttonElement;
			}
			
			return false;
		},

		/**
		 * Creates the flash element to be inserted inside {{#crossLink "VideoPlayer/selector:property"}}{{/crossLink}} when browser doesn't support HTML5 video.
		 *
		 * @method  createFlashElement
		 */
		createFlashElement: function () {
			this.createPoster();

			var params = {
				"allowScriptAccess": "always",
				"movie": this.options.fallbackOptions.swf,
				"allowNetworking": "all",
				"wmode": "transparent",
				"bgcolor": "#000000"
			};

			var flashvars = {
				"video": this.getVideoSource()
			};

			var ieFix = '',
			randomId = this.setClass('fallback') + '_' + Math.floor(Math.random() * 999);

			if ($.browser.msie) {
				ieFix = ' id="' + randomId + '" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"';
			}

			var fallbackHTML = '<object type="application/x-shockwave-flash" width="100%" height="100%" data="' + this.options.fallbackOptions.swf + '" ' + ieFix + '>';
			fallbackHTML += this.addParams(params, flashvars);
			fallbackHTML += '</object>';

			this.video = $(fallbackHTML);

			$(this.selector).append(this.video);
		},

		/**
		 * Add params and embed tag to fallback flash element.
		 *
		 * @method  addParams
		 * @param  {Object} params  Flash params properties
		 * @param  {Object} flashvars Flashvars option
		 * @return {String} All parameters to put inside flash Element
		 */
		addParams: function (params, flashvars) {
			var paramsArr = [],
				flashVarsArr = [],
				embed = '<embed ';
			
			for (var fv in flashvars) {
				flashVarsArr.push(fv + '=' +flashvars[fv]);
			}

			
			params.flashvars = flashVarsArr.join('&');
			
			for (var i in params) {
				paramsArr.push('<param name="' + i + '" value="' + params[i] + '">');
				embed += i + '="' + params[i] + '" ';
			}
				
			embed += '>';

			return paramsArr.join(' ') + embed;
		},

		/**
		 * Create an image to add in front of video player when video hasn't been played yet.
		 *
		 * @method  createPoster
		 */
		createPoster: function () {
			if (this.defaultVideo.poster) {
				var poster = $('<img src="' + this.defaultVideo.poster + '" class="' + this.setClass('poster') + '">');

				this.selector.append(poster);
				this.posterVisible = true;
			}
		},
		
		/**
		 * Create the progressbar element to append to control bar.
		 *
		 * @method  createProgressBar
		 * @return {jQueryObject} Progress bar element
		 */
		createProgressBar: function () {
			var progressBar = $('<div>').addClass(this.setClass('progress-bar'));
			var progressWrapper = $('<div>').addClass(this.setClass('progress-wrapper'));
			var progressPlay = $('<div>').addClass(this.setClass('progress-play'));
			var progressPointer = $('<div>').addClass(this.setClass('progress-pointer'));
			var progressBuffer = $('<div>').addClass(this.setClass('progress-buffer'));
			
			progressWrapper.append(progressPlay);
			progressWrapper.append(progressPointer);
			progressWrapper.append(progressBuffer);
			progressWrapper.append(this.createClearFloats());
			progressBar.append(progressWrapper);
			
			return progressBar;
		},
		
		/**
		 * Create time element.
		 * @method createTimeDisplay
		 * @return {jQueryObject} Time element.
		 */
		createTimeDisplay: function () {
			var time = $('<div>').addClass(this.setClass('time-display'));
			var current = $('<div>').addClass(this.setClass('time-current'));
			var separator = $('<div>').addClass(this.setClass('time-separator'));
			var total = $('<div>').addClass(this.setClass('time-total'));
			
			time.append(current);
			time.append(separator);
			time.append(total);
			
			return time;
		},
		
		/**
		 * Create video element with poster and append to {{#crossLink "VideoPlayer/selector:property"}}{{/crossLink}}. Throw error if video element can't be created.
		 *
		 * @method  createVideoElement
		 */
		createVideoElement: function () {
			try {
				this.createPoster();

				this.video = $('<video>Your browser doesn\'t support video tag.</video>');
				this.video.attr('src', this.getVideoSource());
				this.video.width('100%');
				this.video.height('100%');
				
				if (this.defaultVideo.subtitle) {
					this.video.append('<track src="'+this.defaultVideo.subtitle+'"></track>');
				}
				
				$(this.selector).append(this.video);
			} catch (e) {
				this.supportHTML5 = false;
				var errorEl = $('<p class="' + this.setClass('error-message') + '"></p>')
				.html('Your browser doesn\'t support html5 video. Try to setup a fallback in options.');
				$(this.selector).append(errorEl);
			}

		},
		
		/**
		 * Create volume control bar element to append to {{#crossLink "VideoPlayer/selector:property"}}{{/crossLink}}. Currently only vertical.
		 *
		 * @method  createVolumeBar
		 * @return {jQueryObject} Volume control bar element.
		 */
		createVolumeBar: function () {
			var volume = $('<div>').addClass(this.setClass('volume'));
			var volumeBtn = $('<div>').addClass(this.setClass('volume-button')).html('Volume');
			var volumeBar = $('<div>').addClass(this.setClass('volume-bar'));
			var volumeIconPlus = $('<div>').addClass(this.setClass('volume-icon-plus')).html('+');
			var volumeWrapper = $('<div>').addClass(this.setClass('volume-wrapper'));
			var volumePosition = $('<div>').addClass(this.setClass('volume-position'));
			var volumeIconLess = $('<div>').addClass(this.setClass('volume-icon-less')).html('-');
			
			volumeWrapper.append(volumePosition);
			
			volumeBar.append(volumeIconPlus);
			volumeBar.append(volumeWrapper);
			volumeBar.append(volumeIconLess);
			
			volume.append(volumeBtn);
			volume.append(volumeBar);
			
			return volume;
		},

		/**
		 * Bind native video elements to fire custom events.
		 *
		 * @method  eventsToBind
		 */
		eventsToBind: function () {
			if ($.inArray('progress', this.options.controls)) {
				this.setProgressEvents(this.video.get(0));
			}
		
			if ($.inArray('time', this.options.controls)) {		
				this.setupTime();
			}
			
			if ($.inArray('volume', this.options.controls)) {		
				this.volumeSetup();
			}
		},
		
		/**
		 * Get X position of an HTML Element in window.
		 *
		 * @method findPosX
		 * @param  {jQueryObject} obj The element to find the X position.
		 * @return {Integer} Current left position of this element
		 */
		findPosX: function (obj) {
			obj = obj.get(0);
			var curleft = obj.offsetLeft;
			while(obj = obj.offsetParent) {
				curleft += obj.offsetLeft;
			}
			
			return curleft;
		},
		

		/**
		 * Get Y position of an HTML Element in window.
		 *
		 * @method findPosY
		 * @param  {jQueryObject} obj The element to find the Y position.
		 * @return {Integer} Current top position of this element
		 */
		findPosY: function (obj) {
			obj = obj.get(0);
			var curtop = obj.offsetTop;
			while(obj = obj.offsetParent) {
				curtop += obj.offsetTop;
			}

			return curtop;
		},
		
		/**
		 * Format seconds to be shown as minutes:seconds.
		 *
		 * @method  formatTime
		 * @param  {Integer} secs Time in seconds
		 * @return {String} Formated time in minutes and seconds
		 */
		formatTime: function (secs) {
			var minutes = Math.floor(secs / 60);
			var seconds = Math.round(secs - (minutes * 60));
			
			if (seconds == 60) {
				seconds = 0;
				minutes = minutes + 1;
			}
			
			if (seconds < 10) {
				seconds = '0' + seconds;
			}
			
			return minutes + ':' + seconds;
		},
		
		/**
		 * To be executed when fullscreen event is fired.
		 *
		 * @method  fullscreenEvent
		 */
		fullscreenEvent: function () {
			var fullScreenBtn = $(this.getClass('fullscreen'));
			fullScreenBtn.toggleClass('fullscreen');

			if (!this.fullscreen) {
				this.selector.addClass('fullscreen');
				fullScreenBtn.removeClass('hover');
				this.fullscreen = true;
			}
			else {
				this.selector.removeClass('fullscreen');
				fullScreenBtn.removeClass('hover');
				this.fullscreen = false;
			}

			this.setupProgressBar();
		},
		
		/**
		 * Get a class with prefix and "." selector. Ex. **.prefix** + **className**
		 *
		 * @method  getClass
		 * @param  {String} name Class name
		 * @return {String} **.** + **prefix** + **class name**
		 */
		getClass: function (name) {
			return '.' + this.options.prefix + name;
		},
		
		/**
		 * Sum the size of each element inside control bar, except progress bar.
		 *
		 * @method getControlsSize
		 * @return {Integer} Sum of all elements size
		 */
		getControlsSize: function () {
			var size = 0;
			var _this = this;
			
			this.selector.find(this.getClass('video-controls')).children().each(function () {
				var element = $(this);
				if (!element.hasClass(_this.setClass('progress-bar'))) {
					size += element.outerWidth();
				}
			});
			
			return size;
		},
		
		/**
		 * Get the default video when it is defined in options or get the first one when it's not defined.
		 *
		 * @method  getDefaultVideo
		 * @return {Object} {{#crossLink "VideoPlayer/defaultVideo:property"}}{{/crossLink}} property
		 */
		getDefaultVideo: function () {
			/**
			 * Default video object
			 *
			 * @property defaultVideo
			 */
			if (this.options.videos[this.options.defaultVideo]) {
				this.defaultVideo = this.options.videos[this.options.defaultVideo];
				return this.defaultVideo;
			}
			
			for (var video in this.options.videos) {
				this.defaultVideo = this.options.videos[video];
				return this.defaultVideo;
			}
		},
		
		/**
		 * Get the maximum time of the current subtitle in seconds.
		 * @method  getMaxTime
		 * @return {Integer} Maximum time from subtitle in seconds
		 */
		getMaxTime: function () {
			if (typeof(this.subtitleObj.current) != 'undefined') {
				var timeArr = this.subtitleObj.current[1].split(' --> ');
				return this.timecodeToSec(timeArr[1]);
			}
		},

		/**
		 * Get the minimum time of the current subtitle in seconds.
		 * @method  getMinTime
		 * @return {Integer} Minimum time from subtitle in seconds
		 */		
		getMinTime: function () {
			if (typeof(this.subtitleObj.current) != 'undefined') {
				var timeArr = this.subtitleObj.current[1].split(' --> ');
				return this.timecodeToSec(timeArr[0]);
			}
		},

		/**
		 * Get subtitles from {{#crossLink "VideoPlayer/defaultVideo:property"}}{{/crossLink}}.
		 * @return {String} Subtitle file to load.
		 */
		getSubtitle: function () {
			return this.defaultVideo.subtitle;
		},
		
		/**
		 * Get the right video file using the extension that browser supports.
		 *
		 * @method  getVideoSource
		 * @param  {Object} videoObj A video object set in options or the video object set in {{#crossLink "VideoPlayer/defaultVideo:property"}}{{/crossLink}}
		 * @return {String} Video file to load
		 */
		getVideoSource: function (videoObj) {
			if (!videoObj) {
				videoObj = this.defaultVideo;
			}
			
			if (this.supportHTML5 && (($.browser.safari && !/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) || $.browser.msie)) {
				return videoObj.source.mp4;
			}
			else if (!this.supportHTML5) {
				return this.options.fallbackOptions.relativePath + videoObj.source.mp4;
			}
			
			if (videoObj.source.ogg) {
				return videoObj.source.ogg;
			}
			
			return videoObj.source.webm;
		},

		/**
		 * Hide poster after user clicks on play
		 *
		 * @method  hidePoster
		 */
		hidePoster: function () {
			this.selector.find(this.getClass('poster')).hide();
			this.posterVisible = false;
		},
		
		/**
		 * Mute video when volume button is pressed up.
		 * @method muteVideo
		 */
		muteVideo: function () {
			var volumeButton = this.selector.find(this.getClass('volume-button'));	
			var volumePosition = this.selector.find(this.getClass('volume-position'));
			var video = this.video.get(0);
			
			if (this.supportHTML5) {
				if (video.muted) {
					video.muted = false;
					volumeButton.removeClass('muted');
					volumePosition.height(video.volume * 100 + '%');
				}
				else {
					video.muted = true;
					volumeButton.addClass('muted');
					volumePosition.height(0);
				}
			}
			else {
				if (this.flashMuted) {
					this.flashMuted = false;
					video.volume(this.flashVolume);
					volumeButton.removeClass('muted');
					volumePosition.height(this.flashVolume * 100 + '%');
				}
				else {
					this.flashMuted = true;
					this.flashVolume = video.getVolume();
					video.volume(0);
					volumeButton.addClass('muted');
					volumePosition.height(0);
				}
			}
		},

		/**
		 * Event fired when video is paused.
		 * 
		 * @method pauseEvent
		 */
		pauseEvent: function (element) {
			$(element).parent().find(this.getClass('play')).removeClass('playing').addClass('paused');	
			
			if (this.options.onPause) {
				this.options.onPause.call();
			}
				
			this.playing = false;
		},

		/**
		 * Event fired when video plays.
		 *
		 * @method  playEvent
		 */
		playEvent: function (element) {
			var _this = this;
			var buffer = $(this.getClass('progress-buffer'));
			this.bufferInterval = setInterval(function () {
				_this.updateBuffer(element, buffer);
			}, 1000);
			
			$(element).parent().find(this.getClass('play')).removeClass('paused').addClass('playing');
			this.seekVideoSetup(element);
			
			if (this.options.onPlay) {
				this.options.onPlay.call();
			}
			
			this.playing = true;
		},
		
		/**
		 * Play/Pause action.
		 * 
		 * @method playPause
		 */
		playPause: function () {
			var videoObj = this.video.get(0);

			if (this.supportHTML5) {
				if (videoObj.paused) {
					videoObj.play();
				} else {
					videoObj.pause();
				}
			}
			else {
				if (videoObj.paused()) {
					videoObj._play();
				} else {
					videoObj._pause();
				}
			}
		},
		
		/**
		 * Reset video controls when video source changes to an alternative version.
		 *
		 * @method resetVideo
		 */
		resetVideo: function () {
			this.controls.find(this.getClass('video-controls') + ', ' + this.getClass('progress-buffer')).css('width', 0);
			clearInterval(this.bufferInterval);
		},
		
		/**
		 * When progress bar is changed by user drag event, it changes video to the selected time.
		 *
		 * @method  seekTo
		 * @param  {Integer} xPos the left position of progressbar to get the percentage of video to go to.
		 * @param  {jQueryObject} progWrapper The progress bar wrapper element
		 * @param  {HTMLElement} video Video element
		 */
		seekTo: function (xPos, progWrapper, video) {
			var progressBar = $(this.getClass('progress-play'));
			var progWidth = Math.max(0, Math.min(1, ( xPos - this.findPosX(progWrapper) ) / progWrapper.width() ));

			var seekTo = progWidth * (this.supportHTML5 ? video.duration : video.duration());
			
			if (this.supportHTML5) {
				video.currentTime = seekTo;
			}
			else {
				video.seekTo(seekTo);
			}
			
			var width = Math.round(progWidth * (progWrapper.width()));
			
			progressBar.width(width);
		},
		
		/**
		 * Add mouse events to progress bar.
		 *
		 * @method  seekVideoSetup
		 * @param  {HTMLElement} video Video element
		 */
		seekVideoSetup: function (video) {
			var progWrapper = $(video).parent().find(this.getClass('progress-wrapper'));
			if (progWrapper.length > 0) {
				this.selectable = true;
				
				var _this = this;

				progWrapper.bind('mousedown', function (event) {
					event.preventDefault();
					_this.blockSelection();
					
					$(document).bind('mousemove', function (e) {
						e.preventDefault();
						_this.seekTo(e.pageX, progWrapper, video);
					});
					
					$(document).bind('mouseup', function (e) {
						e.preventDefault();
						_this.unblockSelection();
						$(document).unbind('mousemove');
						$(document).unbind('mouseup');
					});
				});
				
				progWrapper.bind('mouseup', function (e) {
					_this.seekTo(e.pageX, progWrapper, video);
				});
			}
		},
		
		/**
		 * Set a class with prefix. Ex. **prefix** + **className**
		 *
		 * @method  setClass
		 * @param  {String} name Class name
		 * @return {String} **prefix** + **class name**
		 */
		setClass: function (name) {
			return this.options.prefix + name;
		},
		
		/**
		 * Setup native events of video and custom events of flash.
		 *
		 * @method  setProgressEvents
		 * @param  {HTMLElement} video Video element
		 */
		setProgressEvents: function (video) {
			var _this = this;
			var scrubbing = $(this.getClass('progress-play'));
			var buffer = $(this.getClass('progress-buffer'));

			if (this.supportHTML5) {
				video.addEventListener('seeked', function () {
					if (!video.paused)
						video.play();
						
					if (_this.subtitleObj && _this.subtitleObj.loaded) {
						_this.adjustSubtitle(this);
					}
						
					if (_this.options.onSeek) {
						_this.options.onSeek.call();
					}
				}, true);
				
				video.addEventListener('ended', function () {
					scrubbing.width('100%');
					clearInterval(_this.progressInterval);
					
					this.currentTime = 0;
					this.pause();
					
					if (_this.options.onEnd) {
						_this.options.onEnd.call();
					}
					
					_this.playing = false;
					
				}, true);
				
				video.addEventListener('timeupdate', function () {
					_this.updateVideoData(this, scrubbing);
					_this.updateCurrentTime(this);
					
					if (_this.subtitleObj && _this.subtitleObj.loaded) {
						_this.updateSubtitle(video);
					}
					
				}, false);
				
				video.addEventListener('playing', 
					function () {
						if (_this.posterVisible) {
							_this.hidePoster();
						}

						_this.playEvent(this);
					},
					true
				);
				
				video.addEventListener('pause', function () {
					_this.pauseEvent(this);
				}, true);
			}
			else {
				var flashObj = _this.video.get(0);
				this.flashInterval = setInterval(function () {
					_this.updateVideoData(flashObj, scrubbing);
					_this.updateCurrentTime(flashObj);
					
					if (_this.subtitleObj && _this.subtitleObj.loaded) {
						_this.updateSubtitle(flashObj);
					}
				}, 500);

				$(document).bind('flash.play', function () {
					if (_this.posterVisible) {
						_this.hidePoster();
					}

					_this.playEvent(flashObj);
				});

				$(document).bind('flash.pause', function () {
					_this.pauseEvent(flashObj);
				});

				$(document).bind('flash.seeked', function () {
					clearTimeout(_this.seekTimeout);
					_this.seekTimeout = setTimeout(function () {
						if (!flashObj.paused())
							flashObj._play();
							
						if (_this.subtitleObj && _this.subtitleObj.loaded) {
							_this.adjustSubtitle(flashObj);
						}
							
						if (_this.options.onSeek) {
							_this.options.onSeek.call();
						}
					}, 200);
				});

				$(document).bind('flash.videoChanged', function () {
					flashObj._play();

					if (_this.subtitleObj && _this.subtitleObj.loaded) {
						_this.adjustSubtitle(flashObj);
					}
				
					if (_this.options.onVideoChange) {
						_this.options.onVideoChange.call();
					}
				});

				$(document).bind('flash.end', function () {
					if (_this.options.onEnd) {
						_this.options.onEnd.call();
					}
				});
			}
		},
		
		/**
		 * Define progress bar size relative to controls bar size.
		 *
		 * @method  setupProgressBar
		 */
		setupProgressBar: function () {
			var progressBar = this.selector.find(this.getClass('progress-bar'));
			var progBarWidth = this.selector.width();
			var controlsSize = progBarWidth - parseInt(this.getControlsSize());
			
			progressBar.parent().width(progBarWidth); // avoid resize issues on responsive templates
			progressBar.width(controlsSize);
		},
		
		setupSubtitles: function () {
			var _this = this;
			this.subtitleObj = {};
			
			var src = this.defaultVideo.subtitle;
			
			if (src) {
				$.ajax({
					url: src,
					success: function (data) {
						_this.subtitleObj.loaded = true;
						_this.subtitlesToArray(data);
						_this.subtitleObj.count = 0;
						_this.subtitleObj.current = _this.subtitleObj.content[_this.subtitleObj.count];
					}
				});
				
				var subtitleEl = $('<div id="subtitle-'+this.selector.attr('id')+'" class="'+this.setClass('subtitle')+'"></div>');
				var subtitleContent = $('<div class="'+this.setClass('subtitle-content')+'"></div>');
				
				subtitleEl.append(subtitleContent);
				
				this.subtitleObj.element = subtitleEl;
				
				this.selector.append(this.subtitleObj.element);
			}
		},
		
		setupTime: function () {
			var time = this.selector.find(this.getClass('time-display')),
				totalTime = time.find(this.getClass('time-total'));

			time.find(this.getClass('time-current')).html(this.formatTime(0));
			time.find(this.getClass('time-separator')).html(this.options.timeSeparator);
			if (this.supportHTML5) {
				totalTime.html(this.formatTime(this.video.get(0).duration));
			}
			else {
				var _this = this;
				this.getDurationInterval = setInterval(function () {
					if (_this.video.get(0).duration() > 0) {
						totalTime.html(_this.formatTime(_this.video.get(0).duration()));
						clearInterval(_this.getDurationInterval);
					}
				}, 10);
			}
		},
		
		subtitlesToArray: function (data) {
			this.subtitleObj.content = [];
			var breakLine = (data.search('\r\n') == -1) ? '\n' : '\r\n';
			var records = data.split(breakLine + breakLine);
			
			for (var i = 0; i < records.length; i++) {
				if (records[i].length > 0) {
					this.subtitleObj.content.push(records[i].split(breakLine));
				}
			};
		},
		
		timecodeToSec: function (tc) {
			if (tc) {
				tc1 = tc.split(',');
				tc2 = tc1[0].split(':');
				seconds = Math.floor(tc2[0] * 60 * 60) + Math.floor(tc2[1] * 60) + Math.floor(tc2[2]);
				
				return seconds;
			}
		},
		
		toFullscreen: function () {
			clearTimeout(this.fullscreenTimeout);
			var _this = this;

			if (this.supportHTML5) {
				if (!this.fullscreen) {
					if (this.selector.get(0).webkitRequestFullScreen) {
						this.selector.get(0).webkitRequestFullScreen();
					}
					else if (this.selector.get(0).mozRequestFullScreen) {
						this.selector.get(0).mozRequestFullScreen();
					}
				}
				else {
					if (document.webkitCancelFullScreen) {
						document.webkitCancelFullScreen();
					}
					else if (document.mozCancelFullScreen) {
						document.mozCancelFullScreen();
					}
				}
			}
			else {

				// TODO
				var video = this.video.get(0);

				if (!this.fullscreen) {
					this.selector.addClass('fullscreen');
					$(this.getClass('fullscreen')).removeClass('hover');
					this.fullscreen = true;
				}
				else {
					this.selector.removeClass('fullscreen');
					$(this.getClass('fullscreen')).removeClass('hover');					
					this.fullscreen = false;
				}
				
				setTimeout(function () {
					_this.setupProgressBar();
				}, 100);
			}

		},
		
		unblockSelection: function () {
			this.volumeFlag = false;
			document.onselectstart = function () {
				return true;
			};
		},
		
		updateBuffer: function (video, buffer) {
			var buffered;
			if (this.supportHTML5) {
				if (video.buffered && video.buffered.length > 0) {
					buffered = video.buffered.end(0) / video.duration;
					var width = (buffered * 100) + '%';
					buffer.width(width);
					
					if (buffered == 1) {
						clearInterval(this.bufferInterval);
					}
				}
				else {
					buffer.width('100%');
					clearInterval(this.bufferInterval);
				}
			}
			else {
				buffered = video.getBuffer();
				var width = (buffered * 100) + '%';
				buffer.width(width);

				if (buffered == 1) {
					clearInterval(this.bufferInterval);
				}
			}
		},
		
		updateCurrentTime: function (video) {
			var currentTime = this.supportHTML5 ? video.currentTime : video.currentTime();
			var currentTimeElement = $(video).parent().find(this.getClass('time-current'));
			currentTimeElement.html(this.formatTime(currentTime));
		},
		
		updateSubtitle: function (video) {
			var currentTime = this.supportHTML5 ? video.currentTime : video.currentTime();
			
			if (currentTime > this.getMinTime() && currentTime < this.getMaxTime()) {
				this.subtitleObj.current = this.subtitleObj.content[this.subtitleObj.count];
				this.subtitleObj.subtitle = this.subtitleObj.current[2];
			} else {
				this.subtitleObj.subtitle = '';
			}
			
			if (currentTime > this.getMaxTime()) {
				this.subtitleObj.count++;
				this.subtitleObj.current = this.subtitleObj.content[this.subtitleObj.count];
			}
			
			this.subtitleObj.element.find('div:first').html(this.subtitleObj.subtitle);
		},
		
		updateVideoData: function (video, scrubbing) {
			var pointer = scrubbing.parent().find(this.getClass('progress-pointer'));
			var scrubbingWidth = (this.supportHTML5 ? video.currentTime : video.currentTime()) * 100 / (this.supportHTML5 ? video.duration : video.duration());
			scrubbing.width(scrubbingWidth + '%');
			pointer.css('left', scrubbingWidth + '%');
		},
		
		volumeSetup: function () {
			var video = this.video.get(0);
			var volWrapper = this.selector.find(this.getClass('volume-wrapper'));
			var volArea = $(this.getClass('volume'));
			var _this = this;

			this.volumeFlag = false;
			
			volWrapper.bind('mousedown', function (event) {
				event.preventDefault();
				
				_this.blockSelection();
				
				$(document).bind('mousemove', function (event) {
					event.preventDefault();
					_this.volumeTo(event.pageY, volWrapper, video);
				});
				
				
				$(document).bind('mouseup', function (event) {
					event.preventDefault();
					
					if (event.target.className.search('volume') < 0) {
						volArea.removeClass('hover')
					}
					
					_this.unblockSelection();
					
					$(document).unbind('mousemove');
					$(document).unbind('mouseup');
				});
			});
			
			volWrapper.bind('mouseup', function (event) {
				_this.volumeTo(event.pageY, volWrapper, video);
			});
		},
		
		volumeTo: function (yPos, volWrapper, video) {
			var volumeBar = $(this.getClass('volume-position'));
			var volHeight = Math.max(0, Math.min(1, ( yPos - volWrapper.offset().top ) / volWrapper.height() ));
			
			var invertedPercent = (volHeight - 1) * -1;

			if (this.supportHTML5) {
				video.volume = invertedPercent;
			}
			else {
				video.volume(invertedPercent);
			}
			
			volumeBar.height(invertedPercent * 100 + '%');
			
			var volumeButton = $(this.getClass('volume-button'));
			
			if (invertedPercent <= 0) {
				volumeButton.addClass('muted');
			}
			else {
				volumeButton.removeClass('muted');
			}
		}
	};
	
	$.fn.jQPlayer = function (options) {
		var defaults = {
			controls: ['play', 'progress', 'time', 'volume', 'fullscreen', 'alternative'],
			controlsClass: 'video-controls',
			customButtons: {},
			defaultVideo: 'standard',
			floatControls: false,
			onEnd: false,
			onPause: false,
			onPlay: false,
			onSeek: false,
			onStart: false,
			onVideoChange: false,
			prefix: 'html-player-',
			timeSeparator: '/',
			videoId: 'video-',
			fallbackOptions: {
				relativePath: '../',
				swf: 'media/jQPlayer.swf'
			}
		};
		
		var options = $.extend(defaults, options);
		return new VideoPlayer(this, options);
	};
})(jQuery);
