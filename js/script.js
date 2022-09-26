
const goButton = document.getElementById("go");

var meter = new Meter();

var state = {
    paused: false,
    data: {
        last_: null,
        history: [],
        started: null,
        // TODO: min, max, average
        // TODO download csv (https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side)
    },
    // TODO: make this configurable
    max_data: 60 * 60, // ~1 hour

    // onDisconnectCallback
    stop: async function () {
        console.log("state stop");
        // set button state
        goButton.innerText = "Start";
    },

    // onStartCallback
    start: async function () {
        console.log("state start");
        this.reset();
        // set button state
        goButton.innerText = "Stop";
        this.started = new Date();
    },

    reset: function () {
        this.data.last = null;
        this.data.history = [];
    },

    // onPacketCallback
    add: async function (p) {
        if (this.paused) {
            return;
        }

        if (!p) {
            console.error("got empty packet");
            return;
        }

        //console.log("new p:", p);
        this.data.history.unshift(p);
        if (this.data.history.length > this.max_data) {
            // trim data
            this.data.history.length = this.max_data;
        }

        this.data.last = p;

        // add to graph
        var data = [[p.voltage], [p.current], [p.power], [p.energy], [p.capacity], [p.resistance], [p.temp], [p.data1], [p.data2]];
        Plotly.extendTraces('graph', {
            y: data,
            x: new Array(data.length).fill([p.time]),
        }, [0, 1, 2, 3, 4, 5, 6, 7, 8], this.max_data)
    }
}

const voltageElem = document.getElementById("voltage");
const currentElem = document.getElementById("current");
const powerElem = document.getElementById("power");
const energyElem = document.getElementById("energy");
const capacityElem = document.getElementById("capacity");
const resistanceElem = document.getElementById("resistance");
const temperatureElem = document.getElementById("temperature");
const timeElem = document.getElementById("time");
const usbElem = document.getElementById("usb");

Object.defineProperty(state.data, "last", {
    get() {
        return this.last_;
    },
    set(p) {
        this.last_ = p;
        if (p) {
            //console.log("setting state", p);
            voltageElem.innerText = `${p.voltage} V`;
            currentElem.innerText = `${p.current} A`;
            powerElem.innerText = `${p.power} W`;
            energyElem.innerText = `${p.energy} Wh`;
            capacityElem.innerText = `${p.capacity} mAh`;
            resistanceElem.innerText = `${p.resistance} Ω`;
            temperatureElem.innerText = `${p.temp} °C / ${cToF(p.temp)} °F`;
            timeElem.innerText = `${p.duration}`;
            usbElem.innerText = `${p.data1}/${p.data2} V`;
        } else {
            console.log("clearing state");
            voltageElem.innerText = '';
            currentElem.innerText = '';
            powerElem.innerText = '';
            energyElem.innerText = '';
            capacityElem.innerText = '';
            resistanceElem.innerText = '';
            temperatureElem.innerText = '';
            timeElem.innerText = '';
            usbElem.innerText = '';
        }
    }
});

function showError(msg) {
    var dialogElem = document.getElementById('dialog');
    var dialogMessageElem = document.getElementById('dialogError');
    dialogMessageElem.innerText = msg;
    dialogElem.showModal();
}

function cToF(cTemp) {
    return cTemp * 9 / 5 + 32;
}

function Go() {
    if (meter.running) {
        console.log("stopping");
        meter.disconnect();
    } else {
        navigator.bluetooth.requestDevice({
            filters: [{
                services: [UUID_SERVICE]
            }]
        })
            .then(device => {
                goButton.innerText = "Starting....";
                console.log("got device: ", device.name, device.id);
                //console.log(device);
                meter.start(device).catch(error => {
                    console.error("port start error: ", error);
                    showError(error);
                });
            })
            .catch(error => {
                console.log("no port selected. event:", error);
            });
    }
}

const pauseElem = document.getElementById("pause");

function Pause() {
    state.paused = !state.paused;
    if (state.paused) {
        pauseElem.innerText = "Resume";
    } else {
        pauseElem.innerText = "Pause";
    }
}

// TODO pause/resume button?

function Reset() {
    console.log("reset");
    meter.reset();
    state.reset();
    initPlot();
}

function initPlot() {
    const layout = {
        autosize: true,
        showlegend: true,
        automargin: true,
    };

    const config = {
        displaylogo: false,
        responsive: true
    };
    Plotly.newPlot('graph', [{
        name: "Volts",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'yellow' },
    },
    {
        name: "Current",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'green' },
    },
    {
        name: "Power",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'red' },
        visible: 'legendonly',
    },
    {
        name: "Energy",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'purple' },
        visible: 'legendonly',
    },
    {
        name: "Capacity",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'lightblue' },
        visible: 'legendonly',
    },
    {
        name: "Resistance",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'blue' },
        visible: 'legendonly',
    },
    {
        name: "Temperature",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'turquoise' },
        visible: 'legendonly',
    },
    {
        name: "USB D-",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'lightgreen' },
        visible: 'legendonly',
    },
    {
        name: "USB D+",
        y: [],
        x: [],
        mode: 'lines',
        line: { color: 'lightgreen' },
        visible: 'legendonly',
    },
    ], layout, config);
}

document.addEventListener('DOMContentLoaded', async () => {
    if ("bluetooth" in navigator) {
        document.getElementById("warnBlock").hidden = true;
    } else {
        showError("WebBluetooth does not seem to be supported by this device");
    }

    // setup ui callbacks
    meter.onPacketCallback = state.add.bind(state);
    meter.onDisconnectCallback = state.stop.bind(state);
    meter.onStartCallback = state.start.bind(state);

    // init graph
    initPlot();
});


function Save() {
    if (!state.data.last) {
        // no data
        showError("No data yet");
        return;
    }
    const csv_columns = ["time", "voltage", "current", "power", "resistance", "capacity", "energy", "data1", "data2", "temp", "duration",];
    const filename = "data.csv";

    var headers = [];
    
    let csvContent = "data:text/csv;charset=utf-8,";

    // write header
    for (var i = 0; i < csv_columns.length; i++) {
        if (state.data.last[csv_columns[i]]) {
            headers.push(csv_columns[i]);
        }
    }
    csvContent += headers.join(",") + "\r\n";

    // write data
    state.data.history.forEach(function(p) {
        for (const i in headers) {
            var h = headers[i];
            console.log("cav add: ", h, p[h], p);
            csvContent += p[h] + ",";
        }
        csvContent += "\r\n";
    });
    
    console.log("all csv", csvContent);

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link); // Required for FF

    link.click(); // This will download the data file named filename.
}