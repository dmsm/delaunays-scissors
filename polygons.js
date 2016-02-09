// starting vertex marker
var DOT_COLOR = '#FCEBB6';
var DOT_OPACITY = 0.6;
var dot;

var POLY_A_COLOR = '#78C0A8';
var POLY_B_COLOR = '#F0A830';
var POLY_ERR_COLOR = 'red';
var POLY_HALF_OPACITY = 0.6;
var ALPHA = 0.01; // for iteratively calculating target area

var ANIMATION_TIME = 20;
var PADDING = 50;
var PRECISION = 30; // max distance from start vertex at which we close poly


$(function() {
    // set up two.js
    var canvas = document.getElementById('canvas');
    var two = new Two({
        width: $(canvas).width(),
        height: $(window).height()
    }).appendTo(canvas);


    var MAX_H;
    var MAX_W;
    var UNIT_WIDTH;

    var mouse;

    var boxA;
    var boxB;
    var speedAX;
    var speedAY;
    var speedBX;
    var speedBY

    var currI;
    var stackPoly;

    var line;

    var stackPt;
    var area;

    var polyA ;

    var polyB;

    var polyCurr;

    var trisA;
    var trisB;

    var terminalTheta;
    var terminalX;
    var terminalY;

    var isValidPoly;
    var origin;
    var $canvas;
    var offset;

    $("#reset").click(reset);
    $(window).resize(reset);

    reset();

    function reset()
    {
        two.width = $(canvas).width(),
        two.height = $(window).height()

        MAX_H = two.height/2;
        MAX_W = 2*two.width/9;
        UNIT_WIDTH = MAX_W;

        mouse = new Two.Anchor(two.width/2, two.height/2);

        highlight($("#polyA"));

        two.unbind('update').pause();
        two.clear();

        $canvas = $("svg");
        $canvas.unbind('.userDrawing');
        offset  = $canvas.offset();

        two.frameCount = 0;

        trisA = [];
        trisB = [];

        polyA = two.makePath(0,0).noStroke();
        polyA.fill = POLY_A_COLOR;
        polyA.opacity = POLY_HALF_OPACITY;

        polyB = two.makePath(0,0).noStroke();
        polyB.fill = POLY_B_COLOR;
        polyB.opacity = POLY_HALF_OPACITY;

        polyCurr = polyA;

        line = new Two.Path([]);
        line.stroke = POLY_A_COLOR;

        stackPoly = new Two.Path([], true).noStroke();
        stackPoly.fill = POLY_A_COLOR;
        two.add(stackPoly);

         // highlights the start vertex
        dot = two.makeCircle(two.width/2, two.height/2, PRECISION).noStroke();
        dot.fill = DOT_COLOR;
        dot.opacity = DOT_OPACITY;
       

        isValidPoly = true; // none of the edges cross each other
        origin = new Two.Anchor(two.width/2, two.height/2);

        $canvas.bind('mousemove.userDrawing', redraw).bind('click.userDrawing', addPoint);

        currI = 0;

        two.update();
    }

    function redraw(e)
    {
        mouse.x = e.pageX - offset.left;
        mouse.y = e.pageY - offset.top;

        if (line.vertices.length > 0)
        {
            line.vertices.pop();
            line.vertices.push(mouse.clone());
        }

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
            line.vertices = [];
            two.remove(line);

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
                        highlight($("#polyB"));
                        line.stroke = POLY_B_COLOR;
                        polyCurr = polyB;
                        origin = mouse.clone();
                        redraw(e);
                    }
                    else
                    {
                        $canvas.unbind('.userDrawing'); // input completed

                        var areaA = PolyK.GetArea(toPolyK(polyA));
                        var areaB = PolyK.GetArea(toPolyK(polyB));
                        area = calculateArea(polyA, polyB);
                        
                        highlight($("#rescale"));

                        two.frameCount = 0;

                        two.bind('update', scale(polyA, ANIMATION_TIME, area/areaA)).play();
                        two.bind('update', scale(polyB, ANIMATION_TIME, area/areaB, function() {

                            var boxA = PolyK.GetAABB(toPolyK(polyA));
                            var boxB = PolyK.GetAABB(toPolyK(polyB));

                            two.bind('update', translate(polyA, ANIMATION_TIME, -boxA.x+PADDING, -boxA.y+PADDING)).play();
                            two.bind('update', translate(polyB, ANIMATION_TIME, two.width-boxB.x-boxB.width-PADDING, two.height-boxB.y-boxB.height-PADDING, function() {
                                highlight($("#triangulate"));
                                triangulate();
                                two.bind('update', pause(ANIMATION_TIME/2, constructStack)).play();
                            })).play();
                        })).play();
                        
                    }
                }
            }
            else // first vertex
            {
                origin = polyCurr.vertices[polyCurr.vertices.length-1];

                polyCurr.vertices.push(mouse.clone());

                line.vertices = [origin.clone(), origin.clone()];
                two.add(line);

                redraw(e);
            }
        }
    }

    function constructStack() {
        highlight($("#constructStack"));

        var currTri = trisA[currI];

        two.bind('update', straightenTri(currTri, ANIMATION_TIME, function() {
            var box = PolyK.GetAABB(toPolyK(currTri));
            var longestSide = currTri.vertices[0].distanceTo(currTri.vertices[1]);
            two.bind('update', translate(currTri, ANIMATION_TIME, PADDING-box.x, two.height-box.y-box.height-longestSide, function() {
                two.bind('update', triToRect(currTri, function () {
                    two.bind('update', normalizeRect(currTri, UNIT_WIDTH, function() {
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

                            if(currI < trisA.length-1)
                            {
                                currI++;
                                constructStack();
                            }
                            else
                            {
                                currI = 0;
                                two.bind('update', pause(ANIMATION_TIME/2, deconstructStack)).play();
                            }
                        })).play();
                    })).play();
                })).play();
            })).play();
        })).play();
    }

    function deconstructStack() {
        highlight($("#deconstructStack"));

        var currTri = trisB[currI];

        var sliceHeight = PolyK.GetArea(toPolyK(currTri)) / UNIT_WIDTH;
        var stackBox = PolyK.GetAABB(toPolyK(stackPoly));

        if(currI == trisB.length-1) two.remove(stackPoly);
        else stackPoly.vertices = makeVertices([stackBox.x, stackBox.y+sliceHeight, stackBox.x+stackBox.width, stackBox.y+sliceHeight, stackBox.x+stackBox.width, stackBox.y+stackBox.height, stackBox.x, stackBox.y+stackBox.height]);


        var slice = makePoly([stackBox.x, stackBox.y, stackBox.x+stackBox.width, stackBox.y, stackBox.x+stackBox.width, stackBox.y+sliceHeight, stackBox.x, stackBox.y+sliceHeight]);
        slice.fill = stackPoly.fill;
        two.add(slice);

        var longestSide = currTri.vertices[0].distanceTo(currTri.vertices[1]);

        var sliceBox = PolyK.GetAABB(toPolyK(slice));

        two.bind('update', translate(slice, ANIMATION_TIME, two.width-sliceBox.x-Math.max(sliceBox.width, longestSide)-PADDING, longestSide-sliceBox.y, function() {
            two.bind('update', normalizeRect(slice, longestSide, function() {
                two.bind('update', rectToTri(slice, currTri, function() {
                    two.bind('update', rotate(currTri, ANIMATION_TIME, terminalTheta, false, 0, 0, function() {
                        var triBox = PolyK.GetAABB(toPolyK(currTri));
                        two.bind('update', translate(currTri, ANIMATION_TIME, terminalX-triBox.x, terminalY-triBox.y, function() {
                            if(currI < trisB.length-1)
                            {
                                currI++;
                                deconstructStack();
                            }
                            else
                            {
                                for (var i = 0; i < trisB.length; i++) two.remove(trisB[i]);
                                polyB.fill = POLY_A_COLOR;
                            }
                        })).play();
                    })).play();
                })).play();
            })).play();
        })).play();
    }

    function pause(frames, callback)
    {
        return function(frameCount) {
            if (frameCount <= frames) {}
            else
            {
                two.unbind('update', arguments.callee).pause();
                two.frameCount = 0;
                if (callback) callback();
            }
        };
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

    function normalizeRect(p, w, callback)
    {
        var box = PolyK.GetAABB(toPolyK(p));

        if (box.width == w)
        {
            if (callback) return callback;
            else return;
        }
        else if (box.width > w)
        {
            return stackUp(p, w, callback);
        }
        else if (box.width * 2 < w)
        {
            return stackDown(p, w, callback);
        }
        else
        {
            var normalH = Math.abs(PolyK.GetArea(toPolyK(p))) / w;

            var penta = makePoly([box.x, box.y+box.height-normalH, box.x, box.y+box.height, box.x+box.width, box.y+box.height, box.x+w*normalH/box.height, box.y+normalH, box.x+(box.height-normalH)*w/box.height, box.y+box.height-normalH]);
            penta.fill = p.fill;
            two.add(penta);

            var smallTri = makePoly([box.x, box.y, box.x, box.y+box.height-normalH, box.x+(box.height-normalH)*w/box.height, box.y+box.height-normalH]);
            smallTri.fill = p.fill;
            two.add(smallTri);

            var bigTri = makePoly([box.x, box.y, box.x+box.width, box.y, box.x+w*normalH/box.height, box.y+normalH]);
            bigTri.fill = p.fill;
            two.add(bigTri);

            two.remove(p);

            return translate(smallTri, ANIMATION_TIME, w*normalH/box.height, normalH, function() {
                two.bind('update', translate(bigTri, ANIMATION_TIME, (box.height-normalH)*w/box.height, box.height-normalH, function() {
                    two.remove(smallTri, bigTri, penta);
                    p.vertices = makeVertices([box.x, box.y+box.height-normalH, box.x+w, box.y+box.height-normalH, box.x+w, box.y+box.height, box.x, box.y+box.height]);
                    two.add(p);
                    if (callback) callback();
                })).play();
            });
        }
    }

    function stackUp(p, w, callback)
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
            two.bind('update', normalizeRect(p, w, callback)).play();
        });

    }

    function stackDown(p, w, callback)
    {
        var box = PolyK.GetAABB(toPolyK(p));
        var pivotX = box.x+box.width;
        var pivotY = box.y+box.height/2;
        
        var top = makePoly([box.x, box.y, pivotX, box.y, pivotX, pivotY, box.x, pivotY]);
        top.fill = p.fill;
        two.add(top);

        var bottom = makePoly([box.x, pivotY, pivotX, pivotY, pivotX, pivotY+box.height/2, box.x, pivotY+box.height/2]);
        bottom.fill = p.fill;
        two.add(bottom);

        two.remove(p);

        return rotate(top, ANIMATION_TIME, Math.PI, false, pivotX, pivotY, function() {
            two.remove(top, bottom);
            p.vertices = makeVertices([box.x, pivotY, pivotX+box.width, pivotY, pivotX+box.width, box.y+box.height, box.x, box.y+box.height]);
            two.add(p);
            two.bind('update', normalizeRect(p, w, callback)).play();
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
        stackPt = new Two.Anchor((two.width-MAX_W)/2, (two.height+(area/UNIT_WIDTH))/2);

        two.remove(polyA);


        var trB = PolyK.Triangulate(polyKB);
        for(var i = 0; i < trB.length; i+=3)
        {
            var triangle = [polyKB[trB[i]*2], polyKB[trB[i]*2+1],
                polyKB[trB[i+1]*2], polyKB[trB[i+1]*2+1],
                polyKB[trB[i+2]*2], polyKB[trB[i+2]*2+1]];
            var t = makePoly(triangle);
            trisB.push(permuteTriVertices(t));
        }
    }

    function makePoly(p) {
        points = [];
        for (var i = 0; i < p.length; i+=2) {
            var x = p[i];
            var y = p[i + 1];
            points.push(new Two.Anchor(x, y));
        }

        var path = new Two.Path(points, true);
        path.stroke = 'white';

        return path;

    }

    function triToRect(t, callback)
    {
        var color = t.fill;

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

        two.remove(t);

        return rotate(leftTri, ANIMATION_TIME, Math.PI, true, leftX, Y, function() {
            two.bind('update', rotate(rightTri, ANIMATION_TIME,Math.PI, false, rightX, Y, function() {
                two.remove(trap, rightTri, leftTri);
                t.vertices = makeVertices([a.x, a.y, a.x, Y, b.x, Y, b.x, b.y]);
                two.add(t);
                if(callback) callback();
            })).play();
        });
    }

    function rectToTri(r, t, callback)
    {
        var box = PolyK.GetAABB(toPolyK(r));
        var triBox = PolyK.GetAABB(toPolyK(t));
        terminalX = triBox.x;
        terminalY = triBox.y;

        (straightenTri(t, 1))(1);
        (translate(t, 1, box.x-t.vertices[1].x, box.y+box.height-t.vertices[1].y))(1);

        var color = r.fill;

        var a = t.vertices[0];
        var b = t.vertices[1];
        var c = t.vertices[2];
        var Y = (c.y+a.y)/2;
        var rightX = (c.x+a.x)/2;
        var leftX = (c.x+b.x)/2;

        var trap = makePoly([a.x, a.y, b.x, b.y, leftX, Y, rightX, Y]);
        trap.fill = color;
        two.add(trap);

        var lt = [leftX, Y, b.x, b.y, b.x, Y];
        var lbox = PolyK.GetAABB(lt);
        var leftTri = makePoly(lt);
        leftTri.fill = color;
        two.add(leftTri);

        var rt = [rightX, Y, a.x, Y, a.x, a.y];
        var rbox = PolyK.GetAABB(rt);
        var rightTri = makePoly(rt);
        rightTri.fill = color;
        two.add(rightTri)

        two.remove(r);

        return rotate(leftTri, ANIMATION_TIME, Math.PI, false, leftX, Y, function() {
            two.bind('update', rotate(rightTri, ANIMATION_TIME,Math.PI, true, rightX, Y, function() {
                two.remove(trap, rightTri, leftTri);
                t.fill = r.fill;
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

    function straightenTri(t, frames, callback)
    {
        var a = t.vertices[0];
        var b = t.vertices[1];
        var c = t.vertices[2];
        terminalTheta = Math.atan((b.y-a.y)/(b.x-a.x));
        var p = PolyK.rotate(toPolyK(t), terminalTheta);
        if (p[5] > p[1])
        {
            terminalTheta += Math.PI;
        }

        return rotate(t, frames, terminalTheta, true, 0, 0, function() {
            if (callback) callback();
        });
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

    function highlight(elt)
    {
        $("li").each(function() {
            $(this).removeClass("highlight");
        });
        elt.addClass("highlight");
    }
});