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

    function calculateMomentum(current, direction, velocity, lower, upper, deceleration) {
        var destination, duration, distance;

        console.log(arguments);

        deceleration = deceleration || 0.0006;

        duration = velocity / deceleration;
        destination = current + (velocity * (duration * duration) * 0.5 * deceleration * direction);

        //destination = current + (velocity * velocity) / (2 * deceleration) * direction;

        if (destination < lower || destination > upper) {
            distance = Math.abs(destination - current);

            destination = destination < lower ? lower :
                destination > upper ? upper :
                destination;
            duration = Math.sqrt((destination - current) / (velocity * 0.5 * deceleration * direction));


            //destination = upper ? lower - (upper / 2.5 * velocity / 8) : lower;
            //distance = Math.abs(destination - current);
            //duration = distance / velocity;
        }

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

        // make sure it is not moving
        moveTo.apply(this, getCurrentPosition.call(this));

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
            y: this.y
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

        var deltaX = this.options.scrollX ? calculateDistance(this._lastPoint.x, ev.pageX) : 0,
            deltaY = this.options.scrollY ? calculateDistance(this._lastPoint.y, ev.pageY) : 0,
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
            triggerEvent.call(this, 'scrollstart', {
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

        triggerEvent.call(this, 'scroll', {
            pointerId: this._curPointer,
            direction: [
                deltaX < 0 ? -1 : deltaX > 0 ? 1 : 0,
                deltaY < 0 ? -1 : deltaY > 0 ? 1 : 0
            ],
            x: newX,
            y: newY
        });
    }

    function handleEnd(ev) {
        if (!this._enabled ||
            this._curPointer !== ev.pointerId) {
            return;
        }

        var duration = new Date().getTime() - this._lastKeyFrame.timestamp,
            deltaX = this.options.scrollX ? calculateDistance(this._lastPoint.x, ev.pageX) : 0,
            deltaY = this.options.scrollY ? calculateDistance(this._lastPoint.y, ev.pageY) : 0,
            distance, velocity, momentum, time,
            newX = this.x + deltaX,
            newY = this.y + deltaY;

        // reset state
        this._curPointer = null;

        document.removeEventListener('pointerup', this._handleEnd, false);
        document.removeEventListener('pointercancel', this._handleEnd, false);
        document.removeEventListener('pointermove', this._handleMove, false);
        console.log('end', newX, newY);
        this.scrollTo(newX, newY);

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
                distance[0] < 0 ? -1 : distance[0] > 0 ? 1 : 0,
                distance[1] < 0 ? -1 : distance[1] > 0 ? 1 : 0
            ];

            velocity = [
                calculateVelocity(distance[0], duration),
                calculateVelocity(distance[1], duration)
            ];

            momentum = [ //inertia
                calculateMomentum(this.x, direction[0], velocity[0], this._boundaries[0], 0),
                calculateMomentum(this.y, direction[1], velocity[1], this._boundaries[1], 0)
            ];

            newX = momentum[0].destination;
            newY = momentum[1].destination;
            time = Math.max(momentum[0].duration, momentum[1].duration);
        }

        if (this.x < 0 && this.x > this._boundaries[0] && // not already in bouncing state
            this.y < 0 && this.y > this._boundaries[1] &&
            (newX != this.x || newY != this.y)) {
            this.scroller.addEventListener('transitionEnd', this._handleTransitionEnd, false);
            this.scroller.addEventListener('webkitTransitionEnd', this._handleTransitionEnd, false);

            this.scrollTo(newX, newY, time);
        } else {
            bounceBack.call(this);
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

    function handleTransitionEnd(ev) {
        this.scroller.removeEventListener('transitionEnd', this._handleTransitionEnd, false);
        this.scroller.removeEventListener('webkitTransitionEnd', this._handleTransitionEnd, false);

        bounceBack.call(this);
    }

    function getCurrentPosition() {
        var style = window.getComputedStyle(this.scroller, null),
            x, y;

        style = (style['transform'] || style['webkitTransform']).split(')')[0].split(', ');
        x = +(style[12] || style[4]);
        y = +(style[13] || style[5]);

        return [x, y];
    }

    function moveTo(x, y) {
        this.x = Math.round(x);
        this.y = Math.round(y);

        var transform = 'translate(' + this.x + 'px,' + this.y + 'px)',
            translateZ = ' translateZ(0)';

        this.scroller.style['transform'] =
        this.scroller.style['webkitTransform'] = transform + translateZ;
    }

    function bounceBack() {
        var newX = this.x > 0 ? 0 :
            this.x < this._boundaries[0] ? this._boundaries[0] :
            this.x,
            newY = this.y > 0 ? 0 :
            this.y < this._boundaries[1] ? this._boundaries[1] :
            this.y;

        console.log('bounce', newX, newY);

        if (this.options.bounce) {
            this.scrollTo(newX, newY, this.options.bounceTime);
        }
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
            bounceEasing: null
        };

        // define initial state
        this._enabled = true;
        this._curPointer = false;

        // event handler
        this._handleStart = handleStart.bind(this);
        this._handleMove = handleMove.bind(this);
        this._handleEnd = handleEnd.bind(this);
        this._handleTransitionEnd = handleTransitionEnd.bind(this);

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
