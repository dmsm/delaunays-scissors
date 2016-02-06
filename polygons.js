// starting vertex dot vars
var DOT_COLOR = '#FFA500';
var DOT_OPACITY = 0.6;
var dot;

// polygon vars
var POLY_A_COLOR = '#00BBFF';
var POLY_B_COLOR = '#1AA130';
var POLY_ERR_COLOR = '#A31D46';
var POLY_HALF_OPACITY = 0.6;
var MAX_H = 200;
var MAX_W = 500;
var ALPHA = 0.01;
var ANIMATION_TIME = 60;
var DECAY = 0.9;
var PADDING = 50;
var UNIT_WIDTH = 200;

 // max distance from start vertex at which we close poly
var PRECISION = 30;

var boxA;
var boxB;
var speedAX;
var speedAY;
var speedBX;
var speedBY

var currentI = 0;

$(function() {
    var two = new Two({
        fullscreen: true
    }).appendTo(document.body);
    var mouse = new Two.Anchor(two.width/2, two.height/2);

    var stackPoly = new Two.Path([], true);
    stackPoly.fill = POLY_A_COLOR;
    two.add(stackPoly);

    var stackPt = new Two.Anchor((two.width-MAX_W)/2, two.height - PADDING);

    var polyA = two.makePath(0,0).noStroke();
    polyA.fill = POLY_A_COLOR;
    polyA.opacity = POLY_HALF_OPACITY;

    var polyB = two.makePath(0,0).noStroke();
    polyB.fill = POLY_B_COLOR;
    polyB.opacity = POLY_HALF_OPACITY;

    var polyCurr = polyA;

    var trisA = [];
    var trisB;

     // marks the start vertex
    dot = two.makeCircle(two.width/2, two.height/2, PRECISION).noStroke();
    dot.fill = DOT_COLOR;
    dot.opacity = DOT_OPACITY;
    two.update();

    var isValidPoly = true; // none of the edges cross each other
    var origin = new Two.Anchor(two.width/2, two.height/2);

    $window = $(window).bind('mousemove.userDrawing', redraw).bind('click.userDrawing', addPoint);

    function redraw(e)
    {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        if(polyCurr.vertices.length == 1)
        {
            polyCurr.vertices.pop();
            polyCurr.vertices.push(mouse.clone());

            if (dot)
            {
                dot.translation.set(mouse.x, mouse.y);
            }
            else
            {
                dot = two.makeCircle(mouse.x, mouse.y, PRECISION).noStroke();
                dot.fill = DOT_COLOR;
                dot.opacity = DOT_OPACITY;
            }
        }
        else
        {
            if(isValidPoly = PolyK.IsSimple(toPolyK(polyCurr)) || origin.distanceTo(mouse) <= PRECISION )
            {
                polyA.fill = POLY_A_COLOR;
                polyB.fill = POLY_B_COLOR;
            }
            else
            {
                polyCurr.fill = POLY_ERR_COLOR;
            }

            if (origin.distanceTo(mouse) > PRECISION)
            {
                polyCurr.opacity = POLY_HALF_OPACITY;

                polyCurr.vertices.pop();
                polyCurr.vertices.push(mouse.clone());
            }
            else
            {
                polyCurr.opacity = 1;
                polyCurr.vertices[polyCurr.vertices.length-1].x = polyCurr.vertices[polyCurr.vertices.length-2].x;
                polyCurr.vertices[polyCurr.vertices.length-1].y = polyCurr.vertices[polyCurr.vertices.length-2].y;
            }
        }

        two.update();
    }

    function addPoint(e)
    {
        if(isValidPoly)
        {
            if(polyCurr.vertices.length > 1)
            {
                if (origin.distanceTo(mouse) > PRECISION)
                {
                    polyCurr.vertices.push(mouse.clone()); // add a vertex

                    redraw(e);
                }
                else if(polyCurr.vertices.length > 3)
                {
                    polyCurr.vertices.pop(); // remove helper mouse pointer vertex
                    two.remove(dot);
                    dot = false;
                    if(PolyK.GetArea(toPolyK(polyCurr)) < 0)
                    {
                        // reverse order of vertices if ccw
                        polyCurr.vertices.reverse();
                    }

                    if(polyCurr == polyA)
                    {
                        // start drawing second poly
                        polyCurr = polyB;
                        origin = mouse.clone();
                        redraw(e);
                    }
                    else
                    {
                        $window.unbind('.userDrawing'); // input completed

                        var areaA = PolyK.GetArea(toPolyK(polyA));
                        var areaB = PolyK.GetArea(toPolyK(polyB));
                        var area = calculateArea(polyA, polyB);
                        
                        two.frameCount = 0;

                        two.bind('update', scale(polyA, 30, area/areaA)).play();
                        two.bind('update', scale(polyB, 30, area/areaB, function() {

                            var boxA = PolyK.GetAABB(toPolyK(polyA));
                            var boxB = PolyK.GetAABB(toPolyK(polyB));

                            two.bind('update', translate(polyA, ANIMATION_TIME, -boxA.x, -boxA.y)).play();
                            two.bind('update', translate(polyB, ANIMATION_TIME, -(boxB.x - boxA.width - PADDING), -boxB.y, function() {
                                triangulate();
                                buildStack();
                            })).play();
                        })).play();
                        
                    }
                }
            }
            else // first vertex
            {
                origin = polyCurr.vertices[polyCurr.vertices.length-1];

                polyCurr.vertices.push(mouse.clone());

                redraw(e);
            }
        }
    }

    function buildStack() {
        var currTri = trisA[currentI];

        two.bind('update', straightenTri(currTri, function() {
            var box = PolyK.GetAABB(toPolyK(currTri));
            two.bind('update', translate(currTri, ANIMATION_TIME, 500, 500, function() {
                two.bind('update', triToRect(currTri, function () {
                    two.bind('update', normalizeRect(currTri, function() {
                        var box = PolyK.GetAABB(toPolyK(currTri));
                        stackPt.y -= box.height;
                        two.bind('update', translate(currTri, ANIMATION_TIME, stackPt.x-box.x, stackPt.y-box.y, function(){
                            two.remove(currTri);

                            var stackHeight;
                            if (stackPoly.vertices.length > 0) stackHeight = PolyK.GetAABB(toPolyK(stackPoly)).height;
                            else stackHeight = 0;

                            stackPoly.vertices = makeVertices(
                                [stackPt.x, stackPt.y, stackPt.x+UNIT_WIDTH, stackPt.y, 
                                stackPt.x+UNIT_WIDTH, stackPt.y+box.height+stackHeight, stackPt.x, stackPt.y+box.height+stackHeight]
                            );  

                            if(currentI < trisA.length-1)
                            {
                                currentI++;
                                buildStack();
                            }
                        })).play();
                    })).play();
                })).play();
            })).play();
        })).play();
    }


    function calculateArea(a, b)
    {
        var kA = toPolyK(a);
        var kB = toPolyK(b);

        var boxA = PolyK.GetAABB(kA);
        var boxB = PolyK.GetAABB(kB);

        while (boxA.width > MAX_W || boxA.height > MAX_H)
        {
            kA = PolyK.scale(kA, 1-ALPHA, 1-ALPHA);
            boxA = PolyK.GetAABB(kA);
        }
        while (boxA.width < MAX_W && boxA.height < MAX_H)
        {
            kA = PolyK.scale(kA, 1+ALPHA, 1+ALPHA);
            boxA = PolyK.GetAABB(kA);
        }

        while (boxB.width > MAX_W || boxB.height > MAX_H)
        {
            kB = PolyK.scale(kB, 1-ALPHA, 1-ALPHA);
            boxB = PolyK.GetAABB(kB);
        }
        while (boxB.width < MAX_W && boxB.height < MAX_H)
        {
            kB = PolyK.scale(kB, 1+ALPHA, 1+ALPHA);
            boxB = PolyK.GetAABB(kB);
        }

        return Math.min(PolyK.GetArea(kA), PolyK.GetArea(kB))
    }

    function normalizeRect(p, callback)
    {
        var box = PolyK.GetAABB(toPolyK(p));

        if (box.width == UNIT_WIDTH)
        {
            if (callback) return callback;
            else return;
        }
        else if (box.width > UNIT_WIDTH)
        {
            return stack(p, callback);
        }
        else
        {
            var normalH = Math.abs(PolyK.GetArea(toPolyK(p))) / UNIT_WIDTH;

            var penta = makePoly([box.x, box.y+box.height-normalH, box.x, box.y+box.height, box.x+box.width, box.y+box.height, box.x+UNIT_WIDTH*normalH/box.height, box.y+normalH, box.x+(box.height-normalH)*UNIT_WIDTH/box.height, box.y+box.height-normalH]);
            penta.fill = p.fill;
            two.add(penta);

            var smallTri = makePoly([box.x, box.y, box.x, box.y+box.height-normalH, box.x+(box.height-normalH)*UNIT_WIDTH/box.height, box.y+box.height-normalH]);
            smallTri.fill = p.fill;
            two.add(smallTri);

            var bigTri = makePoly([box.x, box.y, box.x+box.width, box.y, box.x+UNIT_WIDTH*normalH/box.height, box.y+normalH]);
            bigTri.fill = p.fill;
            two.add(bigTri);

            two.remove(p);

            speeedUp();

            return translate(smallTri, ANIMATION_TIME, UNIT_WIDTH*normalH/box.height, normalH, function() {
                two.bind('update', translate(bigTri, ANIMATION_TIME, (box.height-normalH)*UNIT_WIDTH/box.height, box.height-normalH, function() {
                    two.remove(smallTri, bigTri, penta);
                    p.vertices = makeVertices([box.x, box.y+box.height-normalH, box.x+UNIT_WIDTH, box.y+box.height-normalH, box.x+UNIT_WIDTH, box.y+box.height, box.x, box.y+box.height]);
                    two.add(p);
                    if (callback) callback();
                })).play();
            });
        }
    }

    function stack(p, callback)
    {
        var box = PolyK.GetAABB(toPolyK(p));
        var pivotX = box.x+box.width/2;
        var pivotY = box.y;
        
        var left = makePoly([pivotX, pivotY, box.x, box.y, box.x, box.y+box.height, pivotX, box.y+box.height]);
        left.fill = p.fill;
        two.add(left);

        var right = makePoly([pivotX, pivotY, box.x+box.width, box.y, box.x+box.width, box.y+box.height, pivotX, box.y+box.height]);
        right.fill = p.fill;
        two.add(right);

        two.remove(p);

        return rotate(right, ANIMATION_TIME, Math.PI, true, pivotX, pivotY, function() {
            two.remove(left, right);
            p.vertices = makeVertices([box.x, box.y-box.height, pivotX, box.y-box.height, pivotX, box.y+box.height, box.x, box.y+box.height]);
            two.add(p);
            two.bind('update', normalizeRect(p, callback)).play();
        });

    }

    function triangulate()
    {
        var polyKA = toPolyK(polyA);
        var polyKB = toPolyK(polyB);

        var trA = PolyK.Triangulate(polyKA);
        for(var i = 0; i < trA.length; i+=3)
        {
            var triangle = [polyKA[trA[i]*2], polyKA[trA[i]*2+1],
                polyKA[trA[i+1]*2], polyKA[trA[i+1]*2+1],
                polyKA[trA[i+2]*2], polyKA[trA[i+2]*2+1]];
            var t = makePoly(triangle);
            t.fill = POLY_A_COLOR;
            trisA.push(permuteTriVertices(t));
            two.add(t);
            UNIT_WIDTH = Math.min(UNIT_WIDTH, 2*t.vertices[0].distanceTo(t.vertices[1])-1);
        }

        two.remove(polyA);

        trisB = PolyK.Triangulate(polyKB);
    }

    function makePoly(p) {
        points = [];
        for (var i = 0; i < p.length; i+=2) {
            var x = p[i];
            var y = p[i + 1];
            points.push(new Two.Anchor(x, y));
        }

        var path = new Two.Path(points, true);

        return path;

    }

    function triToRect(t, callback)
    {
        var color = t.fill;
        two.remove(t);

        var a = t.vertices[0];
        var b = t.vertices[1];
        var c = t.vertices[2];
        var Y = (c.y+a.y)/2;
        var rightX = (c.x+a.x)/2;
        var leftX = (c.x+b.x)/2;

        var trap = makePoly([a.x, a.y, b.x, b.y, leftX, Y, rightX, Y]);
        trap.fill = color;
        two.add(trap);

        var lt = [c.x, Y, leftX, Y, c.x, c.y];
        var lbox = PolyK.GetAABB(lt);
        var leftTri = makePoly(lt);
        leftTri.fill = color;
        two.add(leftTri);

        var rt = [rightX, Y, c.x, Y, c.x, c.y];
        var rbox = PolyK.GetAABB(rt);
        var rightTri = makePoly(rt);
        rightTri.fill = color;
        two.add(rightTri)

        speeedUp();

        return rotate(leftTri, ANIMATION_TIME, Math.PI, true, leftX, Y, function() {
            two.bind('update', rotate(rightTri, ANIMATION_TIME,Math.PI, false, rightX, Y, function() {
                two.remove(trap, rightTri, leftTri);
                t.vertices = makeVertices([a.x, a.y, a.x, Y, b.x, Y, b.x, b.y]);
                two.add(t);
                if(callback) callback();
            })).play();
        });
    }

    function makeVertices(p)
    {
        v = [];
        for(var i = 0; i < p.length; i += 2)
        {
            v.push(new Two.Anchor(p[i], p[i+1]));
        }
        return v;
    }

    function straightenTri(t, callback)
    {
        var a = t.vertices[0];
        var b = t.vertices[1];
        var c = t.vertices[2];
        var theta = Math.atan((b.y-a.y)/(b.x-a.x));
        var p = PolyK.rotate(toPolyK(t), theta);
        if (p[5] > p[1])
        {
            theta += Math.PI;
        }

        speeedUp();

        return rotate(t, ANIMATION_TIME, theta, true, 0, 0, function() {
            if (callback) callback();
        });
    }

    function speeedUp()
    {
        ANIMATION_TIME *= DECAY;
    }

    function permuteTriVertices(t)
    {
        var a = t.vertices[0];
        var b = t.vertices[1];
        var c = t.vertices[2];
        var ab = a.distanceTo(b);
        var ac = a.distanceTo(c);
        var bc = b.distanceTo(c);
        var max = Math.max(ab, ac, bc);
       
        var perm;
        if (max == ab)
        {
            perm = [a,b,c];
        }
        else if (max == ac)
        {
            perm = [c,a,b];
        }
        else
        {
            perm = [b,c,a];
        }

        t.vertices = perm;
        return t;
    }

    function toPolyK(p)
    {
        return $.map(p.vertices, function(v) {
            return [v.x, v.y];
        })
    }

    function translate(p, frames, x, y, callback)
    {
        var speedX = x / frames;
        var speedY = y / frames;

        return function(frameCount) {
            if (frameCount <= frames)
            {
                p.vertices = makeVertices(PolyK.translate(toPolyK(p), speedX, speedY));
            }
            else
            {
                two.unbind('update', arguments.callee).pause();
                two.frameCount = 0;
                if(callback) callback();
            }
        }
    }

    function rotate(p, frames, theta, ccw, x, y, callback)
    {
        var speedTheta = theta / frames;
        if (!ccw) speedTheta *= -1;

        return function(frameCount) {
            if (frameCount <= frames)
            {
                p.vertices = makeVertices(PolyK.rotate(toPolyK(p), speedTheta, x, y));
            }
            else
            {
                two.unbind('update', arguments.callee).pause();
                two.frameCount = 0;
                if(callback) callback();
            }
        }
    }

    function scale(p, frames, alpha, callback)
    {
        var speedAlpha = Math.pow(alpha, 1 / (2*frames));

        return function(frameCount) {
            if (frameCount <= frames)
            {
                p.vertices = makeVertices(PolyK.scale(toPolyK(p), speedAlpha, speedAlpha));
            }
            else
            {
                two.unbind('update', arguments.callee).pause();
                two.frameCount = 0;
                if(callback) callback();
            }
        }
    }
});




