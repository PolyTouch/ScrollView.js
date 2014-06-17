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
            transition: 'cubic-bezier(0, 0, 0.5, 1.5)'
        },
        elastic: {

        }
    };

    // helpers
    function triggerEvent(type, data) {
        var ev = new CustomEvent(type, {
            detail: data || {},
            bubbles: true,
            cancelable: true
        });

        this.view.dispatchEvent(ev);
    }

    function calculateDistance(start, end) {
        return end - start;
    }

    function calculateVelocity(distance, duration) {
        var velocity = Math.abs(distance) / duration; // px/ms

        return velocity;
    }

    function calculateMomentum(current, velocity, lower, upper, deceleration) {
        var destination,
            duration;
        console.log(lower, upper);
        deceleration = deceleration === undefined ? 0.0006 : deceleration;

        destination = current + (velocity * velocity) / (2 * deceleration);

        if (destination < lower) {
            destination = lower;
        } else if (destination > upper) {
            destination = upper;
        }

        duration = velocity / deceleration;

        return {
            destination: Math.round(destination),
            duration: parseFloat(duration)
        };
    }

    // private functions
    function handleStart(ev) {

        if (!this._enabled || this._curPointer) {
            return;
        }

        var timestamp = new Date().getTime();

        this._curPointer = ev.pointerId; // lock for pointer
        this._hasMoved = false; // if scrolling has started

        this._boundaries = [
            -this.view.scrollWidth + this.view.clientWidth,
            -this.view.scrollHeight + this.view.clientHeight
        ];

        // previous point for delta calculation
        this._lastPoint = {
            timestamp: timestamp,
            x: ev.pageX,
            y: ev.pageY
        };

        // last key frame for velocity caluclation
        this._lastKeyFrame = {
            timestamp: timestamp,
            x: this.x,
            y: ev.pageY
        };

        // bind events
        document.addEventListener('pointerup', this._handleEnd, false);
        document.addEventListener('pointercancel', this._handleEnd, false);
        document.addEventListener('pointermove', this._handleMove, false);
    }

    function handleMove(ev) {
        if (!this._enabled || this._curPointer !== ev.pointerId) {
            return;
        }

        var deltaX = this.options.scrollX ? ev.pageX - this._lastPoint.x : 0,
            deltaY = this.options.scrollY ? ev.pageY - this._lastPoint.y : 0,
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

        // consider boundaries
        newX = newX > 0 ? 0 : newX; // lower
        newY = newY > 0 ? 0 : newY; // lower
        newX = newX < this._boundaries[0] ? this._boundaries[0] : newX;
        newY = newY < this._boundaries[1] ? this._boundaries[1] : newY;

        if (!this._hasMoved) {
            this._hasMoved = true;
            triggerEvent.call(this, 'scrollstart', {
                pointerId: this._curPointer
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

        triggerEvent.call(this, 'scroll', {
            pointerId: this._curPointer,
            direction: [
                deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0,
                deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0
            ]
        });
    }

    function handleEnd(ev) {
        if (!this._enabled ||
            this._curPointer !== ev.pointerId) {
            return;
        }

        var duration = new Date().getTime() - this._lastKeyFrame.timestamp,
            distance, direction, velocity, momentum,
            newX = this.x, newY = this.y, time;

        // reset state
        this._curPointer = null;

        document.removeEventListener('pointerup', this._handleEnd, false);
        document.removeEventListener('pointercancel', this._handleEnd, false);
        document.removeEventListener('pointermove', this._handleMove, false);

        if (!this._hasMoved) { // has never scrolled
            return
        }

        // start momentum animation if needed
        if (this.options.momentum && duration < 300) {
            distance = [
                calculateDistance(this._lastKeyFrame.x, this.x),
                calculateDistance(this._lastKeyFrame.y, this.y)
            ];

            direction = [
                distance[0] < 0 ? -1 : 1,
                distance[1] < 0 ? -1 : 1
            ];

            velocity = [
                calculateVelocity(distance[0], duration),
                calculateVelocity(distance[1], duration)
            ];

            momentum = [
                calculateMomentum(this.x, velocity[0], this._boundaries[0], 0),
                calculateMomentum(this.y, velocity[1], this._boundaries[1], 0)
            ];

            console.log(momentum);

            newX = momentum[0].destination;
            newY = momentum[1].destination;
            time = Math.max(momentum[0].duration, momentum[1].duration);
        }



        // TODO wait with eventing for transition
        if (ev.type === 'pointercancel') {
            triggerEvent.call(this, 'scrollcancel', {
                pointerId: this._curPointer
            });
        }

        triggerEvent.call(this, 'scrollend', {
            pointerId: this._curPointer
        });
    }

    function moveTo(x, y) {
        var transform = 'translate(' + x + 'px,' + y + 'px)',
            translateZ = ' translateZ(0)';

        this.x = x;
        this.y = y;

        this.scroller.style['transform'] =
        this.scroller.style['webkitTransform'] = transform + translateZ;
    }

    function ScrollView (el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            start: [0, 0],

            scrollX: false,
            scrollY: true,

            momentum: true,

            bounce: true,
            bounceTime: 600,
            bounceEasing: ''
        };

        // define initial state
        this._enabled = true;
        this._curPointer = false;

        // event handler
        this._handleStart = handleStart.bind(this);
        this._handleMove = handleMove.bind(this);
        this._handleEnd = handleEnd.bind(this);

        this.view.addEventListener('pointerdown', this._handleStart, false);

        // inital scroll
        this.scrollTo(this.options.start[0], this.options.start[1]);
    }

    ScrollView.prototype = {
        version: '0.0.0',

        enable: function (cond) {
            this._enabled = cond === false ? cond : true;
        },

        destroy: function () {

        },

        cancel: function (pointerId) {

        },

        scrollTo: function (x, y, time, easing) {
            var ease = easing || easingFn.circular;

            this.scroller.style['transitionTimingFunction'] =
            this.scroller.style['webkitTransitionTimingFunction'] = ease.transition;
            this.scroller.style['transitionDuration'] =
            this.scroller.style['webkitTransitionDuration'] = (time || 0) + 'ms';

            moveTo.call(this, x, y);
        }
    };

    window.ScrollView = ScrollView;

}(this));
