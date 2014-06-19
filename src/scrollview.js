(function (window) {

    var easingFn = {
        quadratic: {
            transition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },
        circular: {
            transition: 'cubic-bezier(0.1, 0.57, 0.1, 1)'
        },
        back: {
            transition: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        },
        bounce: {
            transition: 'cubic-bezier(0,0,.5,1.2)'
        }
    };

    // helpers
    var math = {
        distance: function (start, end) {
            return Math.round(end - start);
        },
        velocity: function (distance, duration) {
            return Math.abs(distance) / duration; // px/ms
        },
        direction: function (delta) {
            return delta < 0 ? -1 : delta > 0 ? 1 : 0;
        },
        inertia: function (current, direction, velocity, lower, upper, deceleration) {
            var destination, duration,
                t, a = deceleration || 0.0006;

            t = velocity / a; // a = v / t
            destination = current + (velocity * (t * t) * 0.5 * a * direction);

            if (destination < lower || destination > upper) {
                destination = destination < lower ? lower :
                    destination > upper ? upper :
                    destination;
                t = Math.sqrt(Math.abs(destination - current) / (velocity * 0.5 * a * direction));
            }

            return {
                destination: Math.round(destination),
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

    function getCurrentPosition() {
        var style = window.getComputedStyle(this.scroller, null),
            match,
            x, y;
        console.log(style['transform'] || style['webkitTransform']);
        style = (style['transform'] || style['webkitTransform']).match(/matrix\( *([0-9]+)px\ *, *([0-9]+)px *\)/);

        style = (style['transform'] || style['webkitTransform']).split(')')[0].split(', ');
        x = +(style[12] || style[4]);
        y = +(style[13] || style[5]);

        console.log(x, y);
        return [x, y];
    }

    function Sv(el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            start: opt.start || [0, 0],

            scrollX: opt.scrollX || false,
            scrollY: opt.scrollY || true,

            inertia: opt.inertia || true,

            bounce: opt.bounce || true,
            bounceTime: opt.bounceTime || 600
        };

        // define initial state
        this._enabled = true;
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
        version: '0.0.0',

        enable: function (cond) {
            this._enabled = cond === false ? cond : true;
        },

        destroy: function () {

        },

        cancel: function (pointerId) {
            if (pointerId && this._curPointer && this._curPointer !== pointerId) {
                return;
            }

            this._curPointer = null;
        },

        scrollTo: function (x, y, time, easing) {
            var ease = easing || easingFn.circular;

            this.scroller.style['transitionTimingFunction'] =
            this.scroller.style['webkitTransitionTimingFunction'] = ease.transition;
            this.scroller.style['transitionDuration'] =
            this.scroller.style['webkitTransitionDuration'] = (time || 0) + 'ms';

            this._transform(x, y);
        },

        _handleStart: function (ev) {
            if (!this._enabled || this._curPointer) {
                return;
            }

            var timestamp = new Date().getTime();

            this._curPointer = ev.pointerId; // lock for pointer
            this._hasMoved = false;

            this._getBoundaries();

            // make sure it is not moving anymore
            this._forceTransitionEnd();

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

            // TODO add WIGGLE_THRESHOLD
            // We need to move at least 10 pixels for the scrolling to initiate
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                return;
            }

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
                }
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
                distance, velocity, inertia, time,
                newX = this.x + deltaX,
                newY = this.y + deltaY;

            // reset state
            this._curPointer = null;

            document.removeEventListener('pointerup', this._handleEnd, false);
            document.removeEventListener('pointercancel', this._handleEnd, false);
            document.removeEventListener('pointermove', this._handleMove, false);
            this.scrollTo(newX, newY);

            if (!this._hasMoved) { // has never scrolled
                return
            }

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

                // TODO add bounce spacing
                inertia = [ //inertia
                    math.inertia(this.x, direction[0], velocity[0], this._boundaries[0], 0),
                    math.inertia(this.y, direction[1], velocity[1], this._boundaries[1], 0)
                ];

                newX = inertia[0].destination;
                newY = inertia[1].destination;
                time = Math.max(inertia[0].duration, inertia[1].duration);
            }

            if (this.x <= 0 && this.x >= this._boundaries[0] && // not already in bouncing state
                this.y <= 0 && this.y >= this._boundaries[1] &&
                (newX != this.x || newY != this.y)) {
                this.scroller.addEventListener('transitionEnd', this._handleInertiaEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);

                this._observePosition();

                this.scrollTo(newX, newY, time);
            } else {
                this._startBounceTransition();
            }

            // TODO wait with eventing for transition
            if (ev.type === 'pointercancel') {
                triggerEvent(this.view, 'scrollcancel', {
                    pointerId: this._curPointer
                });
            }

            triggerEvent(this.view, 'scrollend', {
                pointerId: this._curPointer
            });
        },

        _handleInertiaEnd: function (ev) {
            this.scroller.removeEventListener('transitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);

            this._observePosition(false);
            this._startBounceTransition();
        },

        _startBounceTransition: function () {
            var newX = this.x > 0 ? 0 :
                this.x < this._boundaries[0] ? this._boundaries[0] :
                this.x,
                newY = this.y > 0 ? 0 :
                this.y < this._boundaries[1] ? this._boundaries[1] :
                this.y;

            if (this.options.bounce) {
                this.scroller.addEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
                this.scroller.addEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);
                this._observePosition();

                this.scrollTo(newX, newY, this.options.bounceTime);
            }
        },

        _handleBounceTransitionEnd: function (ev) {
            this._observePosition(false);
            this.scroller.removeEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);
        },

        _forceTransitionEnd: function () {
            this._observePosition(false);
            this.scroller.removeEventListener('transitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleInertiaEnd, false);
            this.scroller.removeEventListener('transitionEnd', this._handleBounceTransitionEnd, false);
            this.scroller.removeEventListener('webkitTransitionEnd', this._handleBounceTransitionEnd, false);
            this._transform.apply(this, this._getTransformPosition() || [0, 0]);
        },

        _transform: function (x, y) {
            this.x = Math.round(x);
            this.y = Math.round(y);

            var transform = 'translate(' + this.x + 'px,' + this.y + 'px)',
                translateZ = ' translateZ(0)';

            this.scroller.style['transform'] =
            this.scroller.style['webkitTransform'] = transform + translateZ;
        },

        _getTransformPosition: function () {
            var style = window.getComputedStyle(this.scroller, null),
                match;

            match = (style['transform'] || style['webkitTransform'])
                .match(/matrix\( *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *, *([^, ]*) *\)/);

            if (match) {
                return [Math.round(match[5]), Math.round(match[6])];
            }

            return null;
        },

        _getBoundaries: function () {
            return this._boundaries = [ // negative numbers because we scroll negative
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
                            pointerId: this._curPointer,
                            x: pos[0],
                            y: pos[1]
                        });
                    }
                    lastPos = pos;

                    this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(obeservationLoop.bind(this));
                };

                this._observeId = (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(obeservationLoop.bind(this))
            }

        },


    };

    window.ScrollView = Sv;

}(this));
