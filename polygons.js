// starting vertex dot vars
var DOT_COLOR = 0xffa500;
var DOT_OPACITY = 0.6;
var dot;

// polygon vars
var POLY_A_COLOR = 0x00bbff;
var POLY_B_COLOR = 0x1aa130; 
var POLY_ERR_COLOR = 0xa31d46;
var POLY_HALF_OPACITY = 0.6;
var isValidPoly;
var polyA = [];
var polyB = [];
var polyCurr;
var sA, sB, sCurr; // sprites

var currentPoint, origin; // for keeping track of first and last vertex

var PRECISION = 30; // max distance from start vertex to close poly

var stage;

function Go()
{
    stage = new Stage("c");

    sA = new Sprite();
    sB = new Sprite();
    stage.addChild(sA);
    stage.addChild(sB);
    sCurr = sA;
    polyCurr = polyA;

    isValidPoly = true;
    
    stage.addEventListener(MouseEvent.CLICK, addPoint);
    stage.addEventListener(MouseEvent.MOUSE_MOVE, userDraw);
}

function addPoint(e)
{
    if (isValidPoly) // polygon simple
    {
        var mousePt = new Point(stage.mouseX, stage.mouseY);
        if(polyCurr.length > 0) // polygon path non-empty
        {
            // check if too far to close poly
            if(Point.distance(origin, mousePt) > PRECISION)
            {
                polyCurr.push(mousePt.x, mousePt.y);
                currentPoint = mousePt;
                isValidPoly = false;
            }
            else if(polyCurr.length >= 3) // valid poly so we close
            {
                userDraw();
                stage.removeChild(dot);
                // if finished first poly, swithch to second
                if (sCurr == sA)
                { 
                    sCurr = sB;
                    polyCurr = polyB;
                }
                // if finished second, done drawing
                else
                {
                    stage.removeEventListener(MouseEvent.CLICK, addPoint);
                    stage.removeEventListener(MouseEvent.MOUSE_MOVE, userDraw);
                }
            }
        }
        else
        {
            // drawing first vertex of poly so we mark it
            origin = mousePt;
            polyCurr.push(mousePt.x, mousePt.y);
            currentPoint = mousePt;
            dot = new Dot();
            dot.x = mousePt.x;
            dot.y = mousePt.y;
            stage.addChild(dot);
            isValidPoly = false;
        }
        userDraw();
    }
}
           
function userDraw()
{
    // we draw the poly only if it exists
    if(polyCurr.length > 0)
    {
        // if we are close enough to start vertex, we draw our final closed poly
        // otherwise we append the current mouse point
        var mousePt = new Point(stage.mouseX, stage.mouseY);
        var polyTemp = polyCurr.slice();
        polyTemp.push(mousePt.x, mousePt.y);
        var polyActual = Point.distance(origin, mousePt) > PRECISION ? polyTemp : polyCurr;
        
        isValidPoly = PolyK.IsSimple(polyActual);

        sCurr.graphics.clear();
        drawPoly(polyActual, sCurr);
    }
}


function drawPoly(poly, p)
{
    var mousePt = new Point(stage.mouseX, stage.mouseY);
    // choose smaller opacity if polygon is not completed
    var opacity = Point.distance(origin, mousePt) > PRECISION ? POLY_HALF_OPACITY : 1;
    var color;
    if (isValidPoly)
    {
        // choose color for poly depending if it is the first or second
        color = polyCurr == polyA ? POLY_A_COLOR : POLY_B_COLOR;
    }   
    else
    {
        // poly is not simple so we color it an error color
        color = POLY_ERR_COLOR;
    }
    p.graphics.beginFill(color, opacity);

    // go through each pair of vertices and draw the edges
    var n = poly.length >> 1;
    p.graphics.moveTo(poly[0], poly[1]);
    for(var i=1; i<n; i++) 
    {
        p.graphics.lineTo(poly[2*i], poly[2*i+1]);
    }
    p.graphics.lineTo(poly[0], poly[1]);

    p.graphics.endFill();
}


function Dot()
{
    Sprite.apply(this);  // inherits from Sprite
    this.graphics.beginFill(DOT_COLOR, DOT_OPACITY);
    this.graphics.drawCircle(0,0,PRECISION);
}
Dot.prototype = new Sprite();