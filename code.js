/* global d3 */

jQuery.extend({
    getQueryParameters: function(str) {
        return (str || document.location.search)
            .replace(/(^\?)/, '')
            .split("&")
            .map(function(n) {
                return n = n.split("="), this[n[0]] = n[1], this;
            }.bind({}))[0];
    }

});

var margin = {
        top: 20,
        right: 40,
        bottom: 30,
        left: 40
    },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - 2 * margin.bottom;
var buildTime = 1 / 6;

var x = d3.time.scale.utc()
    .range([0, width]);
var x2 = d3.time.scale.utc()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);
var y2 = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
var xAxis2 = d3.svg.axis()
    .scale(x2)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
var yAxis2 = d3.svg.axis()
    .scale(y2)
    .orient("right");

var svg = d3.select("#graph").append("svg")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + 2 * margin.bottom)
    .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("submitTimes.json", function(error, data) {
    if (error) throw error;

    var peaks = [],
        lastDate;
    data.forEach(function(t) {
        var date = d3.time.format.iso.parse(t.fields.submitTime);
        if (date - lastDate < 60 * 60 * 1000) {
            peaks[peaks.length - 1].count += 1;
            return;
        }
        peaks.push({
            date: date,
            count: 1
        });
        lastDate = date;
    });

    var xdomain = d3.extent(peaks, function(d) {
        return d.date;
    });
    var params = $.getQueryParameters();
    if (params && params.starttime) {
        xdomain[0] = d3.time.format('%Y-%m-%d').parse(params.starttime);
        peaks = peaks.filter(function(datum) {
            return true || datum.date >= xdomain[0];
        });
    }
    if (params && params.endtime) {
        xdomain[1] = d3.time.format('%Y-%m-%d').parse(params.endtime);
        peaks = peaks.filter(function(datum) {
            return datum.date <= xdomain[1];
        });
    }
    x.domain(xdomain).nice();
    x2.domain(d3.extent(peaks, function(d) {
        return d.date;
    })).nice();
    y.domain(d3.extent(peaks, function(d) {
        return d.count;
    })).nice();
    y2.domain(y.domain().map(function(c) {
        return c * buildTime;
    }));
    var brush = d3.svg.brush()
        .x(x);
    brush.on("brushend", onBrushEnd(brush));
    var brush2 = d3.svg.brush()
        .x(x2);
    brush2.on("brushend", onBrushEnd(brush2));
    brush2.extent(x.domain());

    svg.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + height + ")")
         .call(xAxis)
        .append("text")
         .attr("class", "label")
         .attr("x", width)
         .attr("y", -6)
         .style("text-anchor", "end")
         .text("Request Date");
    svg.append("g")
        .attr("class", "x2 axis")
        .attr("transform", "translate(0," + (height + margin.bottom) + ")")
        .call(xAxis2);
    svg.select("g.x.axis").append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("height", margin.bottom);
    svg.select("g.x2.axis").append("g")
        .attr("class", "x brush")
        .call(brush2)
        .selectAll("rect")
        .attr("height", margin.bottom);
    svg.append("g")
         .attr("class", "y axis")
         .call(yAxis)
        .append("text")
         .attr("class", "label")
         .attr("transform", "rotate(-90)")
         .attr("y", 6)
         .attr("dy", ".71em")
         .style("text-anchor", "end")
         .text("Requests/h");
    svg.append("g")
         .attr("class", "y2 axis")
         .attr("transform", "translate(" + (width + 0) + ", 0)")
         .call(yAxis2)
        .append("text")
         .attr("class", "label")
         .attr("transform", "rotate(-90)")
         .attr("y", 6)
         .attr("dy", "-1.3em")
         .style("text-anchor", "end")
         .text("Buildtime (min)");

    svg.selectAll(".dot")
        .data(peaks)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) {
            return x(d.date);
        })
        .attr("cy", function(d) {
            return y(d.count);
        })
        .attr("title", function(d) {
            var percent = Math.round(d.count * buildTime / 60 * 100);
            return d.count + ", " + percent + "%";
        })
        .style("fill", "red");

});

function formatRoundedDate(d) {
    var floor, ceil, round;
    floor = new Date(d);
    floor.setUTCHours(0);
    floor.setUTCMinutes(0);
    floor.setUTCSeconds(0);
    floor.setUTCMilliseconds(0);
    ceil = new Date(floor);
    ceil.setUTCDate(ceil.getUTCDate() + 1);
    round = ceil - d < d - floor ? ceil : floor;
    return round.getUTCFullYear() +
        '-' + (round.getUTCMonth() + 1) +
        '-' + round.getUTCDate();
}

function onBrushEnd(_brush) {
    return function() {
        if (_brush.empty()) return;
        var extent = _brush.extent();
        var domain = _brush.x().domain();
        var _p = {},
            sd, ed;
        if (extent[0] - domain[0]) {
            // set start date only if it's not start of time
            sd = extent[0];
            _p.starttime = formatRoundedDate(sd);
        }
        if (extent[1] - domain[1]) {
            ed = _brush.extent()[1];
            _p.endtime = formatRoundedDate(ed);
        }
        document.location.search = '?' + $.param(_p);
    };
}