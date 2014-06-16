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
    }, ppcm = (function () {
        var div = document.createElement('div');
        div.style.width = '1cm';

        var body = document.getElementsByTagName('body')[0];
        body.appendChild(div);

        var ppin = document.defaultView
            .getComputedStyle(div, null)
            .getPropertyValue('width');

        body.removeChild(div);

        return parseFloat(ppin);
    }());

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

    function calculateVelocity(distance, startTime, endTime) {
        var velocity = Math.abs(distance) / (endTime - startTime); // px/ms

        return velocity;
    }

    function calculateMomentum(current, distance, velocity, lowerMargin, wrapperSize, deceleration) {
        var destination,
            duration;

        deceleration = deceleration === undefined ? 0.0006 : deceleration;

        destination = current + ( velocity * velocity ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
        duration = velocity / deceleration;

        /*if ( destination < lowerMargin ) {
            destination = wrapperSize ? lowerMargin - ( wrapperSize / 2.5 * ( speed / 8 ) ) : lowerMargin;
            distance = Math.abs(destination - current);
            duration = distance / speed;
        } else if ( destination > 0 ) {
            destination = wrapperSize ? wrapperSize / 2.5 * ( speed / 8 ) : 0;
            distance = Math.abs(current) + destination;
            duration = distance / speed;
        }*/

        return {
            destination: Math.round(destination),
            duration: duration
        };
    }

    // private functions
    function handleStart(ev) {

        if (!this._enabled ||
            this._curPointer) { // already scrolling by another pointer
            return;
        }

        this._curPointer = ev.pointerId; // lock for pointer
        this._hasMoved = false; // if scrolling has started
        this._pointX = ev.pageX;
        this._pointY = ev.pageY;
        this._boundaries = [
            -this.view.scrollWidth + this.view.clientWidth,
            -this.view.scrollHeight + this.view.clientHeight
        ];
        this._lastKeyFrame = {
            timestamp: new Date().getTime(),
            x: ev.pageX,
            y: ev.pageY
        };

        // bind events
        document.addEventListener('pointerup', this._handleEnd, false);
        document.addEventListener('pointercancel', this._handleEnd, false);
        document.addEventListener('pointermove', this._handleMove, false);
    }

    function handleMove(ev) {
        if (!this._enabled ||
            this._curPointer !== ev.pointerId) {
            return;
        }

        var deltaX = this.options.scrollX ? ev.pageX - this._pointX : 0,
            deltaY = this.options.scrollY ? ev.pageY - this._pointY : 0,
            timestamp = new Date().getTime(),
            newX, newY;

        this._pointX = ev.pageX;
        this._pointY = ev.pageY;

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
                x: ev.pageX,
                y: ev.pageY
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

        // reset state
        this._curPointer = null;

        document.removeEventListener('pointerup', this._handleEnd, false);
        document.removeEventListener('pointercancel', this._handleEnd, false);
        document.removeEventListener('pointermove', this._handleMove, false);

        if (this._hasMoved) { // has never scrolled
            return
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
