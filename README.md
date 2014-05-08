gifMark
=======

jQuery Plugin for turning GIFs into Canvas

Uses libgif from the [Buzzfeed Github repo](https://github.com/buzzfeed/libgif-js) to convert an image tag with a .gif source to a canvas element and provides hooks for animated gif playback.

Usage
=====
Call gifMark on an image tag that has a gif src attribute:
  <img id="myGif" src="myGif.gif" alt="A GIF"/>
  
  <script>
    $('#myGif').gifMark();
  </script>

Canvas animation can be controlled via triggers on the canvas element:
  <script>
    $('canvas').trigger('pause'); // Pauses playback
  </script>

The following triggers are available:
* play
* pause
* moveTo, i
* moveRelative, i
