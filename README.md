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

addeventlistner-polyfill/) polyfill for IE 8.0 and older
