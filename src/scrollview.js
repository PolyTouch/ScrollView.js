/*!
 * Scrollview.js @@version
 * http://github.com/PolyTouch/ScrollView.js
 *
 *
 * Copyright 2014 Adobe Systems Incorporated
 * Released under the Apache License v2
 *
 * Author: @@author
 * Date: @@date
 */
(function (global) {

    var easingFn = {
        quadratic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        circular: 'cubic-bezier(0.1, 0.57, 0.1, 1)'
    };

    // helpers
    var math = {
        distance: function (start, end) {
            return Math.floor(end - start);
        },
        velocity: function (distance, duration) {
            return Math.abs(distance) / duration; // px/ms
        },
        direction: function (delta) {
            return delta < 0 ? -1 : delta > 0 ? 1 : 0;
        },
        inertia: function (current, direction, v, lower, upper, a) {
            var dest, t;

            t = v / a; // a = v / t
            dest = current + (v * (t * t) * 0.5 * a * direction);

            if (dest < lower || dest > upper) {
                dest = dest < lower ? lower :
                    dest > upper ? upper :
                    dest;
                t = Math.sqrt(Math.abs((dest - current) / (v * 0.5 * a * direction)));
            }

            return {
                destination: Math.floor(dest),
                duration: parseFloat(t)
            };
        }
    };

    function triggerEvent(elem, type, data) {
        var ev = new CustomEvent(type, {
            detail: data || {},
            bubbles: true,
            cancelable: true
        });

        elem.dispatchEvent(ev);
    }

    /**
     * @class ScrollView
     * @constructor
     * @param {HTMLElement|String} el
     * @param {Object} [options]
     * @param {Number[]} [options.start=[0,0]]
     * @param {Boolean} [options.scrollX=false]
     * @param {Boolean} [options.scrollY=true]
     * @param {Boolean} [options.inertia=true]
     * @param {Number} [options.inertiaDeceleration=0.0006]
     * @param {Boolean} [options.bounce=true]
     * @param {Number} [options.bounceTime=600]
     */
    function Sv(el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            start: opt.start || [0, 0],

            scrollX: opt.scrollX !== undefined ? opt.scrollX : false,
            scrollY: opt.scrollY !== undefined ? opt.scrollY : true,

            inertia: opt.inertia !== undefined ? opt.inertia : true,
            inertiaDeceleration: opt.inertiaDeceleration || 0.0006,

            bounce: opt.bounce !== undefined ? opt.bounce : true,
            bounceTime: opt.bounceTime || 600
        };

        // define initial state
        this._enabled = true;
        this._lastPointer = false;
        this._curPointer = false;

        // event handler
        this._handleStart = this._handleStart.bind(this);
        this._handleMove = this._handleMove.bind(this);
        this._handleEnd = this._handleEnd.bind(this);
        this._handleInertiaEnd = this._handleInertiaEnd.bind(this);
        this._handleBounceTransitionEnd = this._handleBounceTransitionEnd.bind(this);

        this.view.addEventListener('pointerdown', this._handleStart, false);

        // inital scroll
        this.scrollTo(this.options.start[0], this.options.start[1]);
    }

    Sv.prototype = {

        /**
         * Fired when a user initiates a scroll operation.
         * @event scrollstart
         * @param {Number} detail.pointerId
         * @param {Number} detail.x
         * @param {Number} detail.y
         */
        /**
         * Fired while scrolling
         * @event scroll
         * @param {Number} detail.pointerId
         * @param {Number} detail.x
         * @param {Number} detail.y
         */
        /**
         * Fired when a user initiates a scroll operation.
         * @event scrollcancel
         * @param {Number} detail.pointerId
         */
        /**
         * Fired when a user initiates a scroll operation.
         * @event scrollend
         * @param {Number} detail.pointerId
         */

        /**
         * Version of the ScrollView
         * @property version
         * @type {String}
         */
        version: '@@version',

        /**
         * Current position on the x-axis
         * @property x
         * @type {Number}
         */
        x: 0,

        /**
         * Current position on the y-axis
         * @property y
         * @type {Number}
         */
        y: 0,

        /**
         * @method destroy
         */
        destroy: function () {
            this.cancel();
            this.view.removeEventListener('pointerdown', this._handleStart, false);
        },

        /**
         * @method enable
         * @param  {Boolean} [cond] false to disable
         */
        enable: function (cond) {
            this._enabled = cond === false ? cond : true;
        },

        /**
         * @method cancel
         * @param  {Number} [pointerId] cancel if a specific pointer holds the view, or null to cancel anyways
         */
        cancel: function (pointerId) {
            if (pointerId && this._curPointer && this._curPointer !== pointerId) {
                return;
            }

            this._curPointer = false;
            this._forceTransitionEnd();
            document.removeEventListener('pointerup', this._handleEnd, false);
            document.removeEventListener('pointercancel', this._handleEnd, false);
            document.removeEventListener('pointermove', this._handleMove, false);
        },

        /**
         * @method scrollTo
         * @param  {Number} x
         * @param  {Number} y
         * @param  {Number} [time=0]
         * @param  {String} [easing]
         */
        scrollTo: function (x, y, time, easing) {
            var ease = easing || easingFn.circular;

            this.scroller.style.transitionTimingFunction =
            this.scroller.style.webkitTransitionTimingFunction = ease;
            this.scroller.style.transitionDuration =
            this.scroller.style.webkitTransitionDuration = (time || 0) + 'ms';

            this._transform(x, y);
        },

        _handleStart: function (ev) {
            if (!this._enabled || this._curPointer || (ev.pointerType === 'mouse' && ev.buttons !== 1)) {
                return;
            }

            var timestamp = new Date().getTime();

            this._curPointer = ev.pointerId; // lock for pointer
            this._hasMoved = false;

            this._getBoundaries();

            // make sure it is not moving anymore
            this._forceTransitionEnd(true);
            this._lastPointer = ev.pointerId; // memorize the pointer (incl transitions)

            // previous point (based on pointer) for delta calculation
            this._lastPoint = {
                timestamp: timestamp,
                x: ev.pageX,
                y: ev.pageY
            };

            // last key frame for velocity caluclation
            this._lastKeyFrame = {
                timestamp: timestamp,
                x: this.x,
                y: this.y
            };

            // bind events
            document.addEventListener('pointerup', this._handleEnd, false);
            document.addEventListener('pointercancel', this._handleEnd, false);
            document.addEventListener('pointermove', this._handleMove, false);
        },

        _handleMove: function (ev) {
            if (!this._enabled || this._curPointer !== ev.pointerId) {
                return;
            }

            var deltaX = this.options.scrollX ? math.distance(this._lastPoint.x, ev.pageX) : 0,
                deltaY = this.options.scrollY ? math.distance(this._lastPoint.y, ev.pageY) : 0,
                timestamp = new Date().getTime(),
                newX, newY;

            this._lastPoint = {
                timestamp: timestamp,
                x: ev.pageX,
                y: ev.pageY
            };

            newX = this.x + deltaX;
            newY = this.y + deltaY;

            // consider boundaries
            newX = newX > 0 ? // upper
                this.options.bounce ? this.x + deltaX / 3 :
                0 :
                newX;
            newY = newY > 0 ? // upper
                this.options.bounce ? this.y + deltaY / 3 :
                0 :
                newY;
            newX = newX < this._boundaries[0] ? // lower
                this.options.bounce ? this.x + deltaX / 3 :
                this._boundaries[0] :
                newX;
            newY = newY < this._boundaries[1] ? // lower
                this.options.bounce ? this.y + deltaY / 3 :
                this._boundaries[1] :
                newY;

            // initial move
            if (!this._hasMoved) {
                this._hasMoved = true;
                triggerEvent(this.view, 'scrollstart', {
                    pointerId: this._curPointer,
                    x: this.x,
                    y: this.y
                });
            }

            // save new keyframe every 300ms
            if (timestamp - this._lastKeyFrame.timestamp > 300) {
                this._lastKeyFrame = {
                    timestamp: timestamp,
                    x: newX,
                    y: newY
                };
            }

            this.scrollTo(newX, newY);

            triggerEvent(this.view, 'scroll', {
                pointerId: this._curPointer,
                x: newX,
                y: newY
            });
        },

        _handleEnd: function (ev) {
            if (!this._enabled ||
                this._curPointer !== ev.pointerId) {
                return;
            }

            var duration = new Date().getTime() - this._lastKeyFrame.timestamp,
                deltaX = this.options.scrollX ? math.distance(this._lastPoint.x, ev.pageX) : 0,
                deltaY = this.options.scrollY ? math.distance(this._lastPoint.y, ev.pageY) : 0,
                distance, direction, velocity, scrollSpace, inertia, time,
                newX = this.x + deltaX,
                newY = this.y + deltaY;

            // reset state
            this._curPointer = false;

            document.removeEventListener('pointerup', this._handleEnd, false);
            document.removeEventListener('pointercancel', this._handleEnd, false);
            document.removeEventListener('pointermove', this._handleMove, false);

            if (!this._hasMoved) { // has never scrolled
                return;
            }

            // set last position
            this.scrollTo(newX, newY);

            triggerEvent(this.view, 'scroll', {
                pointerId: this._curPointer,
                x: this.x,
                y: this.y
            });

            // start momentum animation if needed
            if (this.options.inertia && duration < 300) {
                distance = [
                    math.distance(this._lastKeyFrame.x, this.x),
                    math.distance(this._lastKeyFrame.y, this.y)
                ];

                direction = [
                    math.direction(distance[0]),
                    math.direction(distance[1])
                ];

                velocity = [
                    math.velocity(distance[0], duration),
                    math.velocity(distance[1], duration)
                ];

                scrollSpace = [
                    this.options.bounce ? this._boundaries[0] - this.view.clientWidth / 2 : this._boundaries[0],
                    this.options.bounce ? this._boundaries[1] - this.view.clientHeight / 2 : this._boundaries[1],
                    this.options.bounce ? 0 + this.view.clientWidth / 2 : 0,
                    this.options.bounce ? 0 + this.view.clientHeight / 2 : 0
                ];

                inertia = [
                    math.inertia(this.x, direction[0], velocity[0], scrollSpace[0], scrollSpace[2], this.options.inertiaDeceleration),
                    math.inertia(this.y, direction[1], velocity[1], scrollSpace[1], scrollSpace[3], this.options.inertiaDeceleration)
                ];

                newX = inertia[0].destination;
                newY = inertia[1].destination;
                time = Math.max(inertia[0].duration, inertia[1].duration);
            }

            this._observePosition();

            if (this.x <= 0 && this.x >= this._boundaries[0] && // not already in bouncing state
                this.y <= 0 && this.y >= this._boundaries[1] &&
                (newX !== this.x || newY !== this.y)) {
                this.scroller.addEventListener('transitionEnd', this._handleInertiaEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);

                this.scrollTo(newX, newY, time,
                        newX > 0 || newX < this._boundaries[0] ||
                        newY > 0 || newY < this._boundaries[1] ? easingFn.quadratic : null);
            } else {
                this._startBounceTransition();
            }
        },

        _handleInertiaEnd: function (ev) {
            if (ev.target !== this.scroller) { // ignore bubbeling events
                return;
            }

            this.scroller.removeEventListener('transitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);

            this._startBounceTransition();
        },

        _startBounceTransition: function () {
            var newX = this.x > 0 ? 0 :
                this.x < this._boundaries[0] ? this._boundaries[0] :
                this.x,
                newY = this.y > 0 ? 0 :
                this.y < this._boundaries[1] ? this._boundaries[1] :
                this.y;

            if (this.options.bounce && (newX !== this.x || newY !== this.y)) {
                this.scroller.addEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);


                this.scrollTo(newX, newY, this.options.bounceTime);
            } else {
                triggerEvent(this.view, 'scrollend', {
                    pointerId: this._lastPointer
                });

                this._observePosition(false);
            }
        },

        _handleBounceTransitionEnd: function (ev) {
            if (ev.target !== this.scroller) { // ignore bubbeling events
                return;
            }

            this.scroller.removeEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);

            triggerEvent(this.view, 'scrollend', {
                pointerId: this._lastPointer
            });

            this._observePosition(false);
        },

        _forceTransitionEnd: function (suppress) {
            this.scroller.removeEventListener('transitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);
            this._transform.apply(this, this._getTransformPosition() || [0, 0]);

            this._observePosition(false);

            if (!suppress) {
                triggerEvent(this.view, 'scrollcancel', {
                    pointerId: this._lastPointer
                });
                triggerEvent(this.view, 'scrollend', {
                    pointerId: this._lastPointer
                });
            }
        },

        _transform: function (x, y) {
            this.x = Math.floor(x);
            this.y = Math.floor(y);

            var transform = 'translate(' + this.x + 'px,' + this.y + 'px)',
                translateZ = ' translateZ(0)';

            this.scroller.style.transform =
            this.scroller.style.webkitTransform = transform + translateZ;
        },

        _getTransformPosition: function () {
            var style = window.getComputedStyle(this.scroller, null),
                match;

            match = (style.transform || style.webkitTransform)
                .match(/matrix\( *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *\)/);

            if (match) {
                return [Math.floor(match[5]), Math.floor(match[6])];
            }

            return null;
        },

        _getBoundaries: function () {
            this._boundaries = [ // negative numbers because we scroll negative
                -this.view.scrollWidth + this.view.clientWidth,
                -this.view.scrollHeight + this.view.clientHeight
            ];
        },

        _observePosition: function (cond) {
            var obeservationLoop, lastPos = this._getTransformPosition();

            if (cond === false) {
                (window.cancelAnimationFrame || window.webkitCancelAnimationFrame)(this._observeId);
            } else {
                obeservationLoop = function () {
                    var pos = this._getTransformPosition();

                    if (lastPos[0] !== pos[0] || lastPos[1] !== pos[1]) {
                        triggerEvent(this.view, 'scroll', {
                            pointerId: this._lastPointer,
                            x: pos[0],
                            y: pos[1]
                        });
                    }
                    lastPos = pos;

                    this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(obeservationLoop.bind(this));
                };

                this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(obeservationLoop.bind(this));
            }

        },


    };

    global.ScrollView = Sv;

}(window.polyTouch || window));
