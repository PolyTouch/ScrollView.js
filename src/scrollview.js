(function (window) {

    var defaults = {
        startX: 0,
        startY: 0,

        scrollX: false,
        scrollY: true,

        momentum: true,

        bounce: true,
        bounceTime: 600,
        bounceEasing: '',

        preventDefault: true
    };

    // private functions
    var start = function (ev) {

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
        this.directionLocked = 0;
        this.startTime = new Date().getTime();
        this.startX    = this.x;
        this.startY    = this.y;
        this.absStartX = this.x;
        this.absStartY = this.y;
        this.pointX    = point.pageX;
        this.pointY    = point.pageY;

        // bind events
        document.addEventListener('pointerup', this._end, false);
        document.addEventListener('pointercancel', this._end, false);
        document.addEventListener('pointermove', this._move, false);
    };

    var move = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        if (!this.hasMoved) {
            // TRIGGER: scrollstart
            this.hasMoved = true;
        }
    };

    var end = function (ev) {
        if (!this.enabled ||
            this.isScrolling !== ev.pointerId) {
            return;
        }

        document.removeEventListener('pointerup', this._end, false);
        document.removeEventListener('pointercancel', this._end, false);
        document.removeEventListener('pointermove', this._move, false);

        // reset state
        this.isScrolling = null;

        if (ev.type === 'pointercancel') {
            // TRIGGER: scrollcancel
        }
        // TRIGGER: scrollend
    };

    function ScrollView (el, opt) {
        this.wrapper = typeof el === 'string' ? document.querySelector(el) : el;
        this.scroller = this.wrapper.children[0];

        // define initial state
        this.enabled = true;
        this.isScrolling = false;

        // event handler
        this._start = start.bind(this);
        this._move = move.bind(this);
        this._end = end.bind(this);

        this.wrapper.addEventListener('pointerdown', this._start, false);
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

}(this));
