// starting vertex dot vars
var DOT_COLOR = '#FFA500';
var DOT_OPACITY = 0.6;
var dot;

// polygon vars
var POLY_A_COLOR = '#00BBFF';
var POLY_B_COLOR = '#1AA130';
var POLY_ERR_COLOR = '#A31D46';
var POLY_HALF_OPACITY = 0.6;

 // max distance from start vertex at which we close poly
var PRECISION = 30;

$(function() {
    var two = new Two({
        fullscreen: true
    }).appendTo(document.body);

    var mouse = new Two.Anchor(0,0);

    var polyA = two.makePath(0,0).noStroke();
    polyA.fill = POLY_A_COLOR;
    polyA.opacity = POLY_HALF_OPACITY;

    var polyB = two.makePath(0,0).noStroke();
    polyB.fill = POLY_B_COLOR;
    polyB.opacity = POLY_HALF_OPACITY;

    var polyCurr = polyA;

    var dot; // marks the start vertex
    var isValidPoly = true; // none of the edges cross each other
    var origin = new Two.Anchor(0,0);

    $window = $(window).bind('mousemove.userDrawing', redraw).bind('click.userDrawing', addPoint);

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

                    if(polyCurr == polyA)
                    {
                        // start drawing second poly
                        polyCurr = polyB;
                        origin = new Two.Anchor(0.0);
                    }
                    else
                    {
                        $window.unbind('.userDrawing'); // input completed
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

    function redraw(e)
    {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        if (origin.distanceTo(mouse) > PRECISION)
        {
            polyCurr.opacity = POLY_HALF_OPACITY;
            polyCurr.vertices[polyCurr.vertices.length-1].x = mouse.x;
            polyCurr.vertices[polyCurr.vertices.length-1].y = mouse.y;
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
});

function toPolyK(p)
{
    return $.map(p.vertices, function(v) {
        return [v.x, v.y];
    })
}
