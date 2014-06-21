ScrollView
====================================

ScrollView is a library which makes containers scrollable with Javascript. Unlike a native Scrolling this allows a more advanced handling which includes inertia, border bounce and continues eventing on mobile devices.

This library is inspired by Matteo's [iScroll](http://iscrolljs.com/) which is a great piece of code. I used to rely on it beforehand, however I wrote my own library to support multi touch, to have real DOM events and a slightly better performance. If you are looking for a scrolling library with extensive browser support and way more features, please go for [iScroll](http://iscrolljs.com/) which is the more complete product.

Getting Started
------------------------------------
Requirements: [W3C Pointer Events](http://www.w3.org/TR/pointerevents/) since they aren't part of any browser besides IE11 by today, please use [Google's Polymer polyfill](https://github.com/polymer/PointerEvents) or [Microsoft's Hand.js](http://handjs.codeplex.com/).

To create a scrollable element, you will need a nested markup structure.

```html
<div id="viewport">
	<div id="scrollpanel">
		<span>content 1</span>
		<span>content 2</span>
		<span>content 3</span>
	</div>
</div>
```

The outer container *#viewport* describes the limit of what is visible, while the inner container *#scrollpanel* contains the content.

```css
#viewport {
    height: 300px;
    overflow: hidden;
}
```
It is necessary to set *overflow* to hidden for the viewport. Additionally a height and a width is desirable. 


```js
var scroller = new ScrollView('#viewport');
```
This one liner of Javascript will activate the scrolling functionality.

Examples
------------------------------------
* [Default](https://cdn.rawgit.com/PolyTouch/ScrollView.js/master/example/vertical.html) scrolling example
* [Horizontal](https://cdn.rawgit.com/PolyTouch/ScrollView.js/master/example/horizontal.html) scrolling example


Options
------------------------------------

In order to initialise a ScrollView you either pass a selector or a HTMLElement.

```js
var elem = document.getElementById('viewport'),
    scroller = new ScrollView(elem);
```
Additionally you can pass an advanced configuration as a second parameter. 

```js
var scroller = new ScrollView('#viewport', {
	scrollX: true
});
```
These options can be passed (also described in the [in-code documentation](https://cdn.rawgit.com/PolyTouch/ScrollView.js/master/docs/index.html))

##### start = [0, 0]

Allows to start at a different scroll position when the View gets initialised:

```js
var scroller = new ScrollView('#viewport', {
	start: [-100, -50]
});
```
This makes the ScrollView start on the x-axis at -100 and on y-axis at -50;

##### scrollX = false and scrollY = true

Enabling this will allow to set the scroll direction for [horizontal](https://cdn.rawgit.com/PolyTouch/ScrollView.js/master/example/horizontal.html) or [vertical](https://cdn.rawgit.com/PolyTouch/ScrollView.js/master/example/vertical.html) scrolling.

```js
var scroller = new ScrollView('#viewport', {
	scrollX: true,
	scrollY: false
});
```

##### inertia = true and inertiaDeceleration = 0.0006

Smooth continues scrolling if the user scrolled with a high enough speed to make the panel continue. The higher the deceleration rate is, the faster the panel will stop.

```js
var scroller = new ScrollView('#viewport', {
	inertia: true,
	inertiaDeceleration: 0.0025
});
```

##### bounce = true and bounceTime = 600

The panel will bounce back to the outer limits if the user leaves them. The bounceTime defines the time in ms how long the bounce transition will be performed.

```js
var scroller = new ScrollView('#viewport', {
	bounce: true,
	bounceTime: 1000
});
```

