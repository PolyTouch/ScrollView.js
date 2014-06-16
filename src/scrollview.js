(function (window) {

    // private functions
    var handleStart = function (ev) {

        if (!this.enabled ||
            this.isScrolling) { // already scrolling by another pointer
            return;
        }

        this.isScrolling = ev.pointerId; // lock for pointer
        this.hasMoved = false;
        this.distX = 0;
        this.distY = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.directionLocked = null;
        this.startTime = new Date().getTime();
        this.startX = this.x;
        this.startY = this.y;
        this.absStartX = this.x;
        this.absStartY = this.y;
        this.pointX = ev.pageX;
        this.pointY = ev.pageY;

        // bind events
        document.addEventListener('pointerup', this._handleEnd, false);
        document.addEventListener('pointercancel', this._handleEnd, false);
        document.addEventListener('pointermove', this._handleMove, false);
    };

    var handleMove = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        var deltaX = ev.pageX - this.pointX,
            deltaY = ev.pageY - this.pointY,
            timestamp = new Date().getTime(),
            newX, newY,
            absDistX, absDistY;

        this.pointX = ev.pageX;
        this.pointY = ev.pageY;
        this.distX += deltaX;
        this.distY += deltaY;
        absDistX = Math.abs(this.distX);
        absDistY = Math.abs(this.distY);

        // TODO add WIGGLE_THRESHOLD

        if (!this.hasMoved) {
            // TRIGGER: scrollstart
            this.hasMoved = true;
        }

        if (!this.directionLocked && !this.options.freeScroll) {
            if (absDistX > absDistY + this.options.directionLockThreshold) {
                this.directionLocked = 'h';
            } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
                this.directionLocked = 'v';
            } else {
                this.directionLocked = 'n';
            }
        }

    };

    var handleEnd = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        document.removeEventListener('pointerup', this._handleEnd, false);
        document.removeEventListener('pointercancel', this._handleEnd, false);
        document.removeEventListener('pointermove', this._handleMove, false);

        // reset state (wait for transition end)
        this.isScrolling = null;

        // wait with eventing for transition
        if (ev.type === 'pointercancel') {
            // TRIGGER: scrollcancel
        }
        // TRIGGER: scrollend
    };

    var transition = function (time) {
        this.scroller.style['transitionDuration'] = (time || 0) + 'ms';
    };

    var translate = function (x, y) {
        var transform = 'translate(' + x + 'px,' + y + 'px)';
        transform += ' translateZ(0)';

        this.scroller.style['transform'] = transform;

        this.x = x;
        this.y = y;
    };


    function ScrollView (el, options) {
        var opt = options || {};

        this.view = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.view.children[0];

        this.options = {
            startX: 0,
            startY: 0,

            scrollX: false,
            scrollY: true,
            freeScroll: false,

            momentum: true,

            bounce: true,
            bounceTime: 600,
            bounceEasing: '',

            preventDefault: true
        };

        // define initial state
        this.enabled = true;
        this.isScrolling = false;

        // event handler
        this._handleStart = handleStart.bind(this);
        this._handleMove = handleMove.bind(this);
        this._handleEnd = handleEnd.bind(this);

        this.view.addEventListener('pointerdown', this._handleStart, false);
    }

    ScrollView.prototype = {
        version: '0.0.0',

        enable: function (cond) {
            this.enabled = cond === false ? cond : true;
        },

        destroy: function () {

        },

        refresh: function () {

        },

        cancel: function (pointerId) {

        },

        scrollTo: function (x, y, time, easing) {

        }
    };

    window.ScrollView = ScrollView;

}(this));
