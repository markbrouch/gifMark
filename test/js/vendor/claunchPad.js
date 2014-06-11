/*
	Tested on jQuery 1.7.1
	Currently Under Development by Carney Claunch III
*/
;(function($) 
{
	$.fn.claunchPad = function( options ) 
	{

		var defaults = {
			TILT: false, //Whether to capture accelerometer events
			SWIPESPACEX:0, //How far a horizontal swipe needs to go before it will trigger our swipe event
			SWIPESPACEY:0, //How far a vertical swipe needs to go before it will trigger our swipe event
			PREVENTSCROLL:false, //Set to true to prevent claunchPad events while scrolling natively
			PREVENTZOOM:false //set to true to prevent claunchpad interfering with 2 finger zoom
		};

		var userOptions = $.extend(defaults , options),
		_this = this, //jQuery object
		startX = 0,
		startY = 0,
		currentX = 0,
		currentY = 0,
		prevX = 0,
		prevY = 0,
		dX = 0,
		dY = 0,
		isScrolling = undefined,
		isZooming = false,
		ax = 0, //Accelleration caused by tilting our screen horizontally
		ay = 0, //Accelleration caused by tilting our screen vertically
		ie = false, //Internet Explorer Fixes as Required NOT IMPLEMENTED
		hasTouch = false, //Do we support touch gestures (swipe)
		swiped = false, //false means we haven't captured a scroll event since the last mouseDown.
		currentlyScrolling = false,
		currentlyDragging = false;

		var touchStart = function(e) //Mouse Down
		{
			if(event.touches)
			{
				startX = currentX = prevX = event.touches[0].pageX;
				startY = currentY = prevY = event.touches[0].pageY;
				dX = dY = 0;
				
				if(userOptions.PREVENTSCROLL)
				{
					isScrolling = false;
				}
				else
				{
					isScrolling = undefined;
				}
				
				isZooming = (userOptions.PREVENTZOOM && event.touches.length >= 2);
			}
			e.stopPropagation();
		};

		/*
			This launches whenever the user has initiated
			a touch event and hasn't yet lifted their finger.
			It will reHandle the touches[0] and fire off a
			moving event with information.
		*/
		var touchMove = function(e) //Mouse Move
		{
			if(event.touches)
			{
				currentX = event.touches[0].pageX;
				currentY = event.touches[0].pageY;
			}

			dX = currentX - startX;
			dY = currentY - startY;

			if(typeof isScrolling == 'undefined')
			{
				isScrolling = !!( this.isScrolling || Math.abs(dX) < Math.abs(dY) );
			}

			if(!isScrolling && !isZooming)
			{
				e.preventDefault();

				_this.trigger("swiping",{
					xS : startX,
					yS : startY,
					xC : currentX,
					yC : currentY,
					xP : prevX,
					yP : prevY,
					dY : dY,
					dX : dX
				});
			}

			e.stopPropagation();

			prevY = currentY;
			prevX = currentX;
		};

		/*
			This launches whenever the touch event
			ends. Essentially this is used to fire
			off a swipe event (ie when a user puts
			their finger down, moves it, and then
			lifts their finger away). This does also
			ends any event that fires while moving.
		*/
		var touchEnd = function(e) //Mouse Up
		{
			if(!isScrolling && !(typeof isScrolling == 'undefined') && !isZooming)
			{
				if(Math.abs(dX) > Math.abs(dY))
				{
					if(dX < -userOptions.SWIPESPACEX)
					{
						_this.trigger("leftswipe");
					}
					else if(dX > userOptions.SWIPESPACEX)
					{
						_this.trigger("rightswipe");
					}
				}
				else if(Math.abs(dX) < Math.abs(dY))
				{
					if(dY < -userOptions.SWIPESPACEY)
					{
						_this.trigger("downswipe");
					}
					else if(dY > userOptions.SWIPESPACEY)
					{
						_this.trigger("upswipe");
					}	
				}
				else
				{
					_this.trigger("clickswipe");
				}

			}
			e.stopPropagation();
		};

		this.unClaunch = function() {
			_this.unbind("touchstart touchmove touchend");
		};

		this.reClaunch = function() {
			_this.bind("touchstart", function(e){
				touchStart(e);
			}).bind("touchmove", function(e){
				touchMove(e);
			}).bind("touchend", function(e){
				touchEnd(e);
			});
		};

		this.reClaunch();
		
		if(userOptions.TILT)
		{
			$(window).bind('devicemotion', function(ev){
				ax = event.accelerationIncludingGravity.x;
				ay = event.accelerationIncludingGravity.y;
			
				_this.trigger("tilting", {aX:ax, aY:ay});
			});
		}

	}
}
 )(jQuery)