// starting vertex dot vars
var DOT_COLOR = '#FFA500';
var DOT_OPACITY = 0.6;
var dot;

// polygon vars
var POLY_A_COLOR = '#00BBFF';
var POLY_B_COLOR = '#1AA130';
var POLY_ERR_COLOR = '#A31D46';
var POLY_HALF_OPACITY = 0.6;
var AREA = 30000;
var EPSILON = 300;
var ALPHA = 0.01;
var TRANSLATION_TIME = 100;
var PADDING = 50;

 // max distance from start vertex at which we close poly
var PRECISION = 30;

var boxA;
var boxB;
var speedAX;
var speedAY;
var speedBX;
var speedBY
var frameZero;

$(function() {
    var two = new Two({
        fullscreen: true
    }).appendTo(document.body);
    var mouse = new Two.Anchor(0,0);

    var t = [450,450,600,450,500,500];
    var triangle = makePoly(t);
    triangle.fill = POLY_A_COLOR
    var triangle2 = makePoly(straightenTri(t));
    var r = makeRect(t);
    r.fill = POLY_B_COLOR;

    var polyA = two.makePath(0,0).noStroke();
    polyA.fill = POLY_A_COLOR;
    polyA.opacity = POLY_HALF_OPACITY;

    var polyB = two.makePath(0,0).noStroke();
    polyB.fill = POLY_B_COLOR;
    polyB.opacity = POLY_HALF_OPACITY;

    var polyCurr = polyA;

    var trisA = [];
    var trisB;

    var dot; // marks the start vertex
    var isValidPoly = true; // none of the edges cross each other
    var origin = new Two.Anchor(0,0);

    $window = $(window).bind('mousemove.userDrawing', redraw).bind('click.userDrawing', addPoint);

    function redraw(e)
    {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        if (origin.distanceTo(mouse) > PRECISION)
        {
            polyCurr.opacity = POLY_HALF_OPACITY;

            polyCurr.vertices.pop();
            polyCurr.vertices.push(new Two.Anchor(mouse.x, mouse.y));
        }
        else
        {
            polyCurr.opacity = 1;
            polyCurr.vertices[polyCurr.vertices.length-1].x = polyCurr.vertices[polyCurr.vertices.length-2].x;
            polyCurr.vertices[polyCurr.vertices.length-1].y = polyCurr.vertices[polyCurr.vertices.length-2].y;
        }

        if(isValidPoly = PolyK.IsSimple(toPolyK(polyCurr)) || origin.distanceTo(mouse) <= PRECISION )
        {
            polyA.fill = POLY_A_COLOR;
            polyB.fill = POLY_B_COLOR;
        }
        else
        {
            polyCurr.fill = POLY_ERR_COLOR;
        }

        two.update();
    }

    function addPoint(e)
    {
        redraw(e);

        if(isValidPoly)
        {
            if(polyCurr.vertices.length > 1)
            {
                if (origin.distanceTo(mouse) > PRECISION)
                {
                    polyCurr.vertices.push(mouse.clone()); // add a vertex
                }
                else if(polyCurr.vertices.length > 3)
                {
                    polyCurr.vertices.pop(); // remove helper mouse pointer vertex
                    two.remove(dot);
                    if(PolyK.GetArea(toPolyK(polyCurr)) < 0)
                    {
                        // reverse order of vertices if ccw
                        polyCurr.vertices.reverse();
                    }

                    if(polyCurr == polyA)
                    {
                        // start drawing second poly
                        polyCurr = polyB;
                        origin = new Two.Anchor(0,0);
                    }
                    else
                    {
                        $window.unbind('.userDrawing'); // input completed
                        two.bind('update', rescale).play();
                    }
                }
            }
            else // first vertex
            {
                dot = two.makeCircle(mouse.x, mouse.y, PRECISION).noStroke();
                dot.fill = DOT_COLOR;
                dot.opacity = DOT_OPACITY;

                origin = polyCurr.vertices[polyCurr.vertices.length-1];

                polyCurr.vertices.push(mouse.clone());
            }

            two.update();
        }
    }

    function rescale(frameCount)
    {
        var polyKA = toPolyK(polyA);
        var polyKB = toPolyK(polyB);
        var areaA = PolyK.GetArea(polyKA);
        var areaB = PolyK.GetArea(polyKB);
        var changeA = false;
        var changeB = false;

        if (Math.abs(areaA-AREA) > EPSILON)
        {
            var alpha = areaA > AREA ? 1-ALPHA : 1+ALPHA;
            polyKA = PolyK.scale(polyKA,alpha,alpha);
            changeA = true;
        }
        if (Math.abs(areaB-AREA) > EPSILON)
        {
            var alpha = areaB > AREA ? 1-ALPHA : 1+ALPHA;
            polyKB = PolyK.scale(polyKB,alpha,alpha);
            changeB = true;

        }

        if(changeA)
        {
            two.remove(polyA);
            polyA = makePoly(polyKA);
            polyA.noStroke();
            polyA.fill = POLY_A_COLOR;
        }
        if(changeB)
        {
            changeB = true;
            two.remove(polyB);
            polyB = makePoly(polyKB);
            polyB.noStroke();
            polyB.fill = POLY_B_COLOR;
        }

        if (!changeA && !changeB)
        {
            two.unbind('update', rescale);

            boxA = PolyK.GetAABB(polyKA);
            boxB = PolyK.GetAABB(polyKB);
            speedAX = -boxA.x / TRANSLATION_TIME;
            speedAY = -boxA.y / TRANSLATION_TIME;
            speedBX = -(boxB.x - boxA.width - PADDING) / TRANSLATION_TIME;
            speedBY = -boxB.y / TRANSLATION_TIME;

            frameZero = frameCount
            two.bind('update', reposition);
        }
    }

    function reposition(frameCount)
    {
        if (frameCount-frameZero < TRANSLATION_TIME)
        {
            var polyKA = toPolyK(polyA);
            var polyKB = toPolyK(polyB);
            var changeA = false;
            var changeB = false;
            polyKA = PolyK.translate(polyKA, speedAX, speedAY)
            polyKB = PolyK.translate(polyKB, speedBX, speedBY)

            two.remove(polyA);
            polyA = makePoly(polyKA);
            polyA.fill = POLY_A_COLOR;
            polyA.noStroke();

            changeB = true;
            two.remove(polyB);
            polyB = makePoly(polyKB);
            polyB.fill = POLY_B_COLOR;
            polyB.noStroke();

            boxA = PolyK.GetAABB(polyKA);
            boxB = PolyK.GetAABB(polyKB);
        }
        else
        {
            two.unbind('update', reposition);
            frameZero = frameCount
            triangulate();
        }
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
            trisA.push(t);
        }
        two.remove(polyA);

        var trB = PolyK.Triangulate(polyKB);
        trisB = trB;
        for(var i = 0; i < trB.length; i+=3)
        {
            var triangle = [polyKB[trB[i]*2], polyKB[trB[i]*2+1],
                polyKB[trB[i+1]*2], polyKB[trB[i+1]*2+1],
                polyKB[trB[i+2]*2], polyKB[trB[i+2]*2+1]];
            var t = makePoly(triangle);
            t.fill = POLY_B_COLOR;
        }
        two.remove(polyB);
    }

    function makePoly(p) {
        points = [];
        for (var i = 0; i < p.length; i+=2) {
            var x = p[i];
            var y = p[i + 1];
            points.push(new Two.Anchor(x, y));
        }

        var path = new Two.Path(points, true);
        two.scene.add(path);

        return path;

    }

    function makeRect(p)
    {
        p = straightenTri(p);
        var ls = getLongestSide(p);
        var Y = (p[ls[2]*2+1]+p[ls[0]*2+1])/2;
        var leftX = (p[ls[2]*2]+p[ls[0]*2])/2;
        var rightX = (p[ls[2]*2]+p[ls[1]*2])/2;
        return makePoly([p[ls[0]*2],p[ls[0]*2+1], leftX, Y, rightX, Y, p[ls[1]*2],p[ls[1]*2+1]]);
    }

    function straightenTri(p)
    {
        var ls = getLongestSide(p);
        var theta = Math.atan((p[ls[1]*2+1]-p[ls[0]*2+1])/(p[ls[1]*2]-p[ls[0]*2]));
        if (p[ls[2]*2+1] > p[ls[0]*2+1])
        {
            theta += Math.PI;
        }
        return PolyK.rotate(p, theta);
    }

    function getLongestSide(p)
    {
        var a = new Two.Anchor(p[0], p[1]);
        var b = new Two.Anchor(p[2], p[3]);
        var c = new Two.Anchor(p[4], p[5]);
        ab = a.distanceTo(b);
        ac = a.distanceTo(c);
        bc = b.distanceTo(c);
        var max = Math.max(ab, ac, bc);
        var longest;
        if (max == ab) longest = [0,1,2];
        else if (max == ac) longest = [0,2,1];
        else longest = [1,2,0];
        return longest;
    }

    function toPolyK(p)
    {
        return $.map(p.vertices, function(v) {
            return [v.x, v.y];
        })
    }
});




