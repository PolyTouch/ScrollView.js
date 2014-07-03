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

    // const
    var MINIMUM_SPEED = 0.01,
        MAXIMUM_SPEED = 1.5,
        MINIMUM_INERTIA_TIME = 325,
        MAXIMUM_INERTIA_TIME = 1500;

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
        inertia: function (current, direction, v, lower, upper, a, t) {
            var dest, s;

            if (Math.abs(v) < MINIMUM_SPEED) {
                t = 0;
                s = current;
            } else {
                s = v * (1 - Math.pow(a, t + 1)) / (1 - a);
            }

            dest = current + (s * direction);

            if (dest < lower || dest > upper) {
                dest = dest < lower ? lower :
                    dest > upper ? upper :
                    dest;

                s = math.distance(current, dest);
                t = s / Math.min(v, MAXIMUM_SPEED);
            }

            t = Math.max(t, MINIMUM_INERTIA_TIME);

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
     * @param {Number[]} [options.limit=[null,null,0,0]
     * @param {Boolean} [options.scrollX=false]
     * @param {Boolean} [options.scrollY=true]
     * @param {Boolean} [options.inertia=true]
     * @param {Number} [options.inertiaTime]
     * @param {Number} [options.inertiaDeceleration=0.0006]
     * @param {Boolean} [options.bounce=true]
     * @param {Number} [options.bounceTime=400]
     * @param {Number} [options.bounceDistance]
     */
    function Sv(el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            start: opt.start || [0, 0],
            limit: [null, null, 0, 0],

            scrollX: opt.scrollX !== undefined ? opt.scrollX : false,
            scrollY: opt.scrollY !== undefined ? opt.scrollY : true,

            inertia: opt.inertia !== undefined ? opt.inertia : true,
            inertiaTime: opt.inertiaTime || Math.min(window.innerHeight, window.innerWidth) * 1.5, // in ms
            inertiaDeceleration: opt.inertiaDeceleration || 0.0006,

            bounce: opt.bounce !== undefined ? opt.bounce : true,
            bounceTime: opt.bounceTime || 400,
            bounceDistance: opt.bounceDistance || Math.floor(Math.max(window.innerHeight, window.innerWidth) / 8)
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
            this._forceTransitionEnd(!this._inTransition);
            this._lastPointer = ev.pointerId; // memorize the pointer (incl transitions)

            // was stopped in a bounce transition
            if (this._isOutOfBoundaries.apply(this, this._getTransformPosition())) {
                this._hasMoved = true;
                triggerEvent(this.view, 'scrollstart', {
                    pointerId: this._curPointer,
                    x: this.x,
                    y: this.y
                });
            }

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

            newX = this.x + deltaX;
            newY = this.y + deltaY;

            // consider boundaries
            newX = Math.floor(newX > this._boundaries[2] ? // upper
                this.options.bounce ? this.x + deltaX / 3 :
                this._boundaries[2] :
                newX);
            newY = Math.floor(newY > this._boundaries[3] ? // upper
                this.options.bounce ? this.y + deltaY / 3 :
                this._boundaries[3] :
                newY);
            newX = Math.floor(newX < this._boundaries[0] ? // lower
                this.options.bounce ? this.x + deltaX / 3 :
                this._boundaries[0] :
                newX);
            newY = Math.floor(newY < this._boundaries[1] ? // lower
                this.options.bounce ? this.y + deltaY / 3 :
                this._boundaries[1] :
                newY);

            // initial move
            if (!this._hasMoved) {

                if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                    return;
                }

                this._hasMoved = true;
                triggerEvent(this.view, 'scrollstart', {
                    pointerId: this._curPointer,
                    x: this.x,
                    y: this.y
                });
            }

            this._lastPoint = {
                timestamp: timestamp,
                x: ev.pageX,
                y: ev.pageY
            };

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
                pointerId: this._lastPointer,
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
                    this.options.bounce ? this._boundaries[0] - this.options.bounceDistance : this._boundaries[0],
                    this.options.bounce ? this._boundaries[1] - this.options.bounceDistance : this._boundaries[1],
                    this.options.bounce ? this._boundaries[2] + this.options.bounceDistance : this._boundaries[2],
                    this.options.bounce ? this._boundaries[3] + this.options.bounceDistance : this._boundaries[3]
                ];

                inertia = [
                    math.inertia(this.x, direction[0], velocity[0], scrollSpace[0], scrollSpace[2],
                        1 - this.options.inertiaDeceleration,
                        this.options.inertiaTime > MAXIMUM_INERTIA_TIME ? MAXIMUM_INERTIA_TIME : this.options.inertiaTime),
                    math.inertia(this.y, direction[1], velocity[1], scrollSpace[1], scrollSpace[3],
                        1 - this.options.inertiaDeceleration,
                        this.options.inertiaTime > MAXIMUM_INERTIA_TIME ? MAXIMUM_INERTIA_TIME : this.options.inertiaTime)
                ];

                newX = inertia[0].destination;
                newY = inertia[1].destination;
                time = Math.max(inertia[0].duration, inertia[1].duration);
            }

            this._observePosition();

            if (!this._isOutOfBoundaries() && (newX !== this.x || newY !== this.y)) {
                this._inTransition = true;

                this.scroller.addEventListener('transitionEnd', this._handleInertiaEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);

                this.scrollTo(newX, newY, time);
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
            var newX = this.x > this._boundaries[2] ? this._boundaries[2] :
                this.x < this._boundaries[0] ? this._boundaries[0] :
                this.x,
                newY = this.y > this._boundaries[3] ? this._boundaries[3] :
                this.y < this._boundaries[1] ? this._boundaries[1] :
                this.y;

            this._inTransition = true;

            if (this.options.bounce && (newX !== this.x || newY !== this.y)) {
                this.scroller.addEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);


                this.scrollTo(newX, newY, this.options.bounceTime);
            } else {
                triggerEvent(this.view, 'scrollend', {
                    pointerId: this._lastPointer
                });

                this._observePosition(false);
                this._inTransition = false;
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
            this._inTransition = false;
        },

        _forceTransitionEnd: function (suppress) {
            this.scroller.removeEventListener('transitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);
            this._transform.apply(this, this._getTransformPosition() || [0, 0]);

            this._observePosition(false);
            this._inTransition = false;

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
            this._boundaries = [ // negative numbers because we scroll negative, 0 if the scroller is smaller than the view
                Math.min(this.options.limit[0] || 0, -this.scroller.scrollWidth + this.view.clientWidth),
                Math.min(this.options.limit[1] || 0, -this.scroller.scrollHeight + this.view.clientHeight),
                this.options.limit[2],
                this.options.limit[3]
            ];
        },

        _isOutOfBoundaries: function (x, y) {
            return !((x || this.x) <= this._boundaries[2] &&
                (x || this.x) >= this._boundaries[0] && // not already in bouncing state
                (y || this.y) <= this._boundaries[3] &&
                (y || this.y) >= this._boundaries[1]);
        },

        _observePosition: function (cond) {
            var observationLoop, lastPos = this._getTransformPosition();

            if (cond === false) {
                (window.cancelAnimationFrame || window.webkitCancelAnimationFrame)(this._observeId);
            } else {
                observationLoop = function () {
                    var pos = this._getTransformPosition();

                    if (lastPos[0] !== pos[0] || lastPos[1] !== pos[1]) {
                        triggerEvent(this.view, 'scroll', {
                            pointerId: this._lastPointer,
                            x: Math.floor(pos[0]),
                            y: Math.floor(pos[1])
                        });
                    }
                    lastPos = pos;

                    this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(observationLoop.bind(this));
                };

                this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(observationLoop.bind(this));
            }

        },


    };

    global.ScrollView = Sv;

}(window.polyTouch || window));
