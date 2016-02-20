// https://en.wikipedia.org/wiki/B%C3%A9zier_curve

function Point(x, y) {
    function getX() {
        return x;
    }
    function getY() {
        return y;
    }
    function plus(other) {
        return Point(x + other.getX(), y + other.getY());
    }
    function minus(other) {
        return Point(x - other.getX(), y - other.getY());
    }
    function scale(k) {
        return Point(k * x, k * y);
    }
    return {
        getX: getX,
        getY: getY,
        plus: plus,
        minus: minus,
        scale: scale
    };
}


function Spline() {
    var p0, p1, p2, p3;
    var radius = 5;

    function init(x0, y0, x1, y1, x2, y2, x3, y3) {
        set_p0(Point(x0, y0));
        set_p1(Point(x1, y1));
        set_p2(Point(x2, y2));
        set_p3(Point(x3, y3));
    }

    function get_points() {
        return [p0, p1, p2, p3];
    }

    function get_coords() {
        return $.map(get_points(), function(p) {
            return [p.getX(), p.getY()];
        });
    }

    function set_p0(q) {
        if (p0 !== undefined && p1 !== undefined) {
            p1 = p1.plus(q.minus(p0));
        }
        p0 = q;
    }

    function set_p3(q) {
        if (p3 !== undefined && p2 !== undefined) {
            p2 = p2.plus(q.minus(p3));
        }
        p3 = q;
    }

    function set_p1(q) {
        p1 = q;
    }

    function set_p2(q) {
        p2 = q;
    }

    function set_p2_neg(q) {
        p2 = p3.scale(2).minus(q);
    }

    function func(t) {
        var u = 1 - t;
        var q0 = p0.scale(u * u * u);
        var q1 = p1.scale(3 * u * u * t);
        var q2 = p2.scale(3 * u * t * t);
        var q3 = p3.scale(t * t * t);
        return q0.plus(q1.plus(q2.plus(q3)));
    }

    function derivative(t) {
        var h = 1.0e-4;
        var f = func(t);
        var fh = func(t + h);
        return fh.minus(f).scale(1 / h);
    }

    function draw(context, steps) {
        var t, dt, z;
        dt = 1.0 / steps;

        context.beginPath();
        context.arc(p0.getX(), p0.getY(), radius, 0, 2*Math.PI*2);
        context.closePath();
        context.fill();

        context.moveTo(p0.getX(), p0.getY());
        context.lineTo(p1.getX(), p1.getY());
        context.stroke();

        context.beginPath();
        context.arc(p1.getX(), p1.getY(), radius, 0, 2*Math.PI*2);
        context.closePath();

        context.moveTo(p0.getX(), p0.getY());
        for (t = dt; t < 1 + dt / 2; t += dt) {
            z = func(t);
            context.lineTo(z.getX(), z.getY());
        }
        context.stroke();
    }

    function handleClick(x, y) {
        function near(point) {
            var xdiff = x - point.getX();
            var ydiff = y - point.getY();
            if (xdiff * xdiff + ydiff * ydiff < radius * radius) {
                return true;
            }
            return false;
        }
        if (near(p0)) return 0;
        if (near(p1)) return 1;
    }

    function partition() {
        var first = Spline();
        var second = Spline();
        var middle = p0.plus(p3).scale(0.5);
        var other = middle.plus(Point(50, 50));
        first.set_p0(p0);
        first.set_p1(p1);
        first.set_p2(middle.scale(2).minus(other));
        first.set_p3(middle);
        second.set_p0(middle);
        second.set_p1(other);
        second.set_p2(p2);
        second.set_p3(p3);
        return [first, second];
    }

    return {
        init: init,
        get_points: get_points,
        get_coords: get_coords,
        set_p0: set_p0,
        set_p1: set_p1,
        set_p2: set_p2,
        set_p3: set_p3,
        set_p2_neg: set_p2_neg,
        partition: partition,
        func: func,
        draw: draw,
        handleClick: handleClick
    };
}


function SplineGroup(imageFile, context, steps) {
    var splines = [];
    var s = Spline();
    s.init(200, 100, 300, 100, 300, 300, 200, 300);
    splines.push(s);
    s = Spline();
    s.init(200, 300, 100, 300, 100, 100, 200, 100);
    splines.push(s);

    function add(spline) {
        splines.push(spline);
    }

    function draw() {
        $('#results').html('');
        var img = new Image();
        dt = 1.0 / steps;
        img.src = './tubes.jpg';
        img.onload = function() {
            var txt = '';
            context.drawImage(img, 0, 0);
            $.map(splines, function(spline) {
                spline.draw(context, steps);
                txt += spline.get_coords() + '\n';
            });
            $('#results').html('<pre>' + txt + '</pre>');
        };
    }

    var previousSpline, dragfunc;

    function handleMouse(event) {
        var done = false;
        var x = event.offsetX;
        var y = event.offsetY;
        switch (event.type) {
            case "mousedown":
                dragfunc = null;
                previousSpline = splines[splines.length - 1];
                $.map(splines, function(spline, index) {
                    if (dragfunc || done) return;
                    var z = spline.handleClick(x, y);
                    var p = previousSpline;
                    if (z === 0) {
                        if (event.altKey) {
                            parts = spline.partition();
                            splines.splice(index, 1, parts[0], parts[1]);
                            draw();
                            done = true;
                        } else {
                            dragfunc = function(x, y) {
                                var z = Point(x, y);
                                spline.set_p0(z);
                                p.set_p3(z);
                                draw();
                            }
                        }
                    }
                    else if (z === 1) {
                        dragfunc = function(x, y) {
                            var z = Point(x, y);
                            spline.set_p1(z);
                            p.set_p2_neg(z);
                            draw();
                        }
                    }
                    previousSpline = spline;
                });
                break;
            case "mouseup":
            case "mouseleave":
                dragfunc = null;
                break;
            case "mousemove":
                if (dragfunc) {
                    dragfunc(x, y);
                }
                break;
        }
    }

    return {
        add: add,
        draw: draw,
        handleMouse: handleMouse
    };
}
