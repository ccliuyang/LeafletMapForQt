new QWebChannel(qt.webChannelTransport, function (channel) {
    var webobj = channel.objects.nativeObj;
    window.nativeObj = webobj;
})

// Start map parameters
var mapStartData =  "map_start_data";
var mapPosition = {
    centerCoords: [59.990, 30.333],
    zoom: 10
};

// Check previously map parameters in session storage
if (sessionStorage.getItem(mapStartData)) {
    mapPosition = JSON.parse(sessionStorage.getItem(mapStartData));
}

// Initialize the map
var map = L.map('mapid', { zoomControl: true, editable: true }).setView(mapPosition.centerCoords, mapPosition.zoom);

var tLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    id: 'mapbox.streets'
}).addTo(map);

L.control.scale().addTo(map);
// Remove leaflet lable
document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';
// Remove cursor drag
document.getElementById('mapid').classList.remove('leaflet-grab');

/////////////////////////////////////////////////////////////////////
// Device type
/////////////////////////////////////////////////////////////////////
//Тип отсутствует
const DevTypeMKUNone = Number(0x00);
//Малогабаритное контролируемое устройство базового исполнения (МКУ-Б)
const DevTypeMKUB = Number(0x01);
//Малогабаритное контролируемое устройство расширенного исполнения (МКУ-Р)
const DevTypeMKUR = Number(0x02);
//Малогабаритное контролируемое устройство упрощенного исполнения (МКУ-У)
const DevTypeMKUU = Number(0x03);
//Индивидуальный носимый трекер (ИНТ)
const DevTypeINT = Number(0x04);
//Электронный браслет (ЭБ)
const DevTypeEB = Number(0x05);
//Электронный браслет расширенного исполнения (ЭБ-Р)
const DevTypeEBR = Number(0x06);
//Малогабаритное устройство оснащения служебных розыскных собак (МУ СРС)
const DevTypeSRS = Number(0x07);
//RFID считыватель
const DevTypeRFID = Number(0x08);
//Телефон
const DevTypePhone = Number(0x11);
//Планшет
const DevTypeTablet = Number(0x12);
//Ноутбук
const DevTypeNotebook = Number(0x13);

var iconsList = new Map([
  [DevTypeMKUNone,  'images/None.png'],
  [DevTypeMKUB,    'images/MKU_B'],
  [DevTypeMKUR, 'images/MKU_R'],
  [DevTypeMKUU, 'images/MKU_U'],
  [DevTypeINT, 'images/INT'],
  [DevTypeEB, 'images/EB'],
  [DevTypeEBR, 'images/EB_R'],
  [DevTypeSRS, 'images/SRS'],
  [DevTypeRFID, 'images/RFID'],
  [DevTypePhone, 'images/Phone'],
  [DevTypeTablet, 'images/Tablet'],
  [DevTypeNotebook, 'images/Notebook']
]);

var iconsTracking = new Map([
  [DevTypeMKUB,    'images/MKU_B_tracking.svg'],
  [DevTypeMKUR, 'images/MKU_R_tracking.svg'],
  [DevTypeINT, 'images/INT_tracking.svg'],
  [DevTypeEB, 'images/EB_tracking.svg'],
  [DevTypeEBR, 'images/EB_R_tracking.svg'],
  [DevTypeSRS, 'images/SRS_tracking.svg']
]);

var iconGray = '.svg',
    iconGreen = '_green.svg',
    iconRed = '_red.svg';

var gprsIcon = 'images/GPRS_map.svg',
    playIcon = 'images/Playback_map.svg';

var groupIcon = 'images/Group_assembled_map.svg',
    grTrackingIcon = 'images/Group_tracking.svg';

// Device state
const DeviceStateInvisible = Number(0x00),
      DeviceStateOk = Number(0x01),
      DeviceStateGray = Number(0x02),
      DeviceStateRed = Number(0x03);

// Controlled Area state
const PrmStateUnk = Number(0x00),
      PrmStateNorm = Number(0x01),
      PrmStateSet = Number(0x02),
      PrmStateErr = Number(0x03);

// Group state
const GroupStatusAssembling = Number(0x01),
      GroupStatusAssembled = Number(0x02),
      GroupStatusChanged = Number(0x03),
      GroupStatusUnassembled = Number(0x04);

// Device status in group
const Master = Number(0),
      Slave = Number(1);

// CSS 
var classMarkerIcon = 'marker-icon';
var classMarkerIconTrk = 'marker-icon-trk';
var classEventCame = 'blinking';
var trackStyle = '';
// Maps headline
var titleDevName = document.getElementById('titleDevName');
var titleGrName = document.getElementById('titleGrName');

/////////////////////////////////////////////////////////////////////
// Events
/////////////////////////////////////////////////////////////////////
var eventsList = new Map([]); 

var eventsXmlData = new XMLHttpRequest();
eventsXmlData.open("GET", "../events.xml", false);
eventsXmlData.send();
var xmlDoc = eventsXmlData.responseXML;
var events = xmlDoc.getElementsByTagName('message');
for (i = 0; i < events.length; i++) { 
    eventsList.set(events[i].getAttribute('flag'), events[i].getAttribute('text'));
}


////////////////////////////////////////////////////////////////////
var markersGroup = new L.MarkerClusterGroup({
    className: 'marker-cluster-device'
});
map.addLayer(markersGroup);
// For track points added in file "leaflet/gpx.js"
var pointsGroup;
// For gpx polyline added in file "leaflet/gpx.js"
var gpxPolyline;

var selectedMarkerId = null;
var selectedGroupId = null;
var currentCircleGSM = {
    id: null,
    circle: null
};
var trackSelectedDevice = null;
var controlledArea = null;

var iconSizeStandart = [26, 26];
var iconSizeSelected = [40, 40];
var iconSizeStandartTrk = [39, 39];
var iconSizeSelectedTrk = [53, 53]; 

var devList = "device_list";
var groupList = "group_list";
// Storage for devices data 
var devices = [];
// Storage for groups data 
var groups = {};
// Storage for markers devices
var devMarkers = {};
// Storage for real-time tracks
var devRealTimeTracks = {};
// Storage for navigation error(-200, -200) timers
var navErrorTimersId = {};

// Recording data in session storage in case of a reboot
window.onbeforeunload = function() {
    // Write devices data
    if (devices.length > 0) {
        sessionStorage.setItem(devList, JSON.stringify(devices));
    }
    // Write groups data
    sessionStorage.setItem(groupList, JSON.stringify(groups));
    // Write map parameters
    var centerCoords = map.getCenter();
    var zoom = map.getZoom();

    mapData = {
        centerCoords: centerCoords,
        zoom: zoom
    };

    sessionStorage.setItem(mapStartData, JSON.stringify(mapData));
}

/////////////////////////////////////////////////////////////////////
// Checking device and device group data in storage. 
// If data is not empty restore the previous state of the map.
// Track is checked at the end of the file "leaflet/gpx.js"
///////////////////////////////////////////////////////////////////// 
// Groups data
if (sessionStorage.getItem(groupList)) {
    groups = JSON.parse(sessionStorage.getItem(groupList));
}
// Devices
if (sessionStorage.getItem(devList)) {
    devices = JSON.parse(sessionStorage.getItem(devList));
    var devIcon;

    devices.forEach((item) => {
        // Check selected status
        if (item.selected) {
            selectedMarkerId = item.id;
            // Set device name in title
            setTitleDeviceName(item);
        }
        // Check state and coordinates of the device
        if (item.coordinates && item.state != DeviceStateInvisible && item.group.devStatus !== Slave) {
            // Set device icon
            devIcon = getDeviceIcon(item);
            // Show on the map
            showDeviceMarker(item, devIcon);
            // Check device selected or not
            if (item.selected) {
                // Controlled Area
                // First: check array bounds
                if (item.controlledArea.bounds.length > 0) {
                    showControlledArea(item.controlledArea.bounds);
                }
                // Second: check edit status
                if (item.controlledArea.edit) {
                    js_onDeviceControlledAreaEdit(item.id);
                }
                // Third: check GSM radius
                if (item.radius > 0 ) {    
                    showCircleGSM(item);
                }
            }
        }
        // Check real-time track status
        if (item.realTimeTrack.tracking) {
            showRealTimeTrack(item);
        }
        // Check navigation error status 
        if (item.navError.occurred && item.navError.timerTime < 60) {
            navigationErrorTimer(item);
        }
    })
}
// Check group selected status
if (sessionStorage.getItem(groupList)) {
    for (var item in groups) {
        if (groups[item].selected) {
            selectedGroupId = groups[item].id;
            // Set group name in title
            setTitleGroupName(groups[item].id);

            if (selectedMarkerId == null) {
                var masterDevice = isCurrentDevice(groups[item].masterId);

                if (masterDevice !== null) {
                    // Controlled Area
                    // First: check array bounds
                    if (masterDevice.controlledArea.bounds.length > 0) {
                        showControlledArea(masterDevice.controlledArea.bounds);
                    }
                    // Second: check edit status
                    if (masterDevice.controlledArea.edit) {
                        js_onDeviceControlledAreaEdit(masterDevice.id);
                    }
                    // Third: check GSM radius
                    if (masterDevice.radius > 0 ) {    
                        showCircleGSM(masterDevice);
                    }
                }
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Get/Set map position
/////////////////////////////////////////////////////////////////////
function js_getMapPosition() {
    var mapCenter = map.getCenter();
    var mapZoom = map.getZoom();

    // Send map position
    nativeObj.onMapPosition(mapCenter.lat, mapCenter.lng, mapZoom);
}

function js_setMapPosition(lat, lng, zoom) {
    var mapCenter = [lat, lng];

    map.flyTo(mapCenter, zoom);
}
/////////////////////////////////////////////////////////////////////
// Add new device
/////////////////////////////////////////////////////////////////////
function js_onAddDevice(name, id, address, gId, type) {
    var newDevice = {
            name: name,
            id: id,
            address: address,
            group: {
                id: gId,
                devStatus: null
            },
            type: Number(type),
            state: DeviceStateOk,
            selected: false,
            keysRemoved: false,
            eventCame: false,
            gprs: false,
            multimedia: false,
            track: {
                show: false,
                trackData: null,
                color: {
                    r: null,
                    g: null,
                    b: null
                }
            },
            realTimeTrack: {
                tracking: false,
                coordinates: [],
                time: [],
                positioning: [],
                color: null,
                mcColor: null,
                mcColorHover: null,
                className: "",
                mcClassName: ""
            },
            controlledArea: {
                edit: false,
                confirmed: false,
                bounds: []
            },
            navError: {
                occurred: false,
                timerTime: 0,
                prevState: null
            }
        }

    devices.push(newDevice);
    
};

/////////////////////////////////////////////////////////////////////
// Show device position on the map 
/////////////////////////////////////////////////////////////////////
function js_onDevicePosition(id, lat, lng, speed, hight, numsat, course, radius, time) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        // Check coordinate values
        if (lat == -200 && lng == -200) {
            // Check navigatiom error status
            if (!currentDevice.navError.occurred) {
                // Rewrite navigation error status for current device
                currentDevice.navError.occurred = true;
                
                // Start timer 
                navigationErrorTimer(currentDevice);
            }
        } else {
            // Check navigatiom error status
            if (currentDevice.navError.occurred) {
                // Stop timer
                if (navErrorTimersId[currentDevice.id]) {
                    clearInterval(navErrorTimersId[currentDevice.id]);

                    delete navErrorTimersId[currentDevice.id];
                }
                // Set previous state
                if (currentDevice.navError.prevState !== null) {
                    currentDevice.state = currentDevice.navError.prevState;
                    
                }
                // Rewrite navigation error data for current device
                currentDevice.navError = {
                    occurred: false,
                    timerTime: 0,
                    prevState: null
                };
                
            }
            // Device data recording
            var newData = {
                coordinates: [lat, lng],
                speed: speed,
                hight: hight,
                numsat: numsat,
                course: course,
                radius: radius,
                time: time
            }

            Object.assign(currentDevice, newData);
            
            // Check the state of the device and grouping status
            if (currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus != Slave) {
                // Set device icon
                devIcon = getDeviceIcon(currentDevice);
                // Show on the map
                showDeviceMarker(currentDevice, devIcon);
                // Check device selected or not
                if (currentDevice.selected || (currentDevice.group.devStatus == Master && selectedGroupId == currentDevice.group.id)) {
                    // GSM circle
                    if (currentDevice.radius > 0 ) {    
                        showCircleGSM(currentDevice);
                    } else if (currentCircleGSM.circle != null) {
                        hideCircleGSM();
                    }
                }
            }
            // Check real-time track status
            if (currentDevice.realTimeTrack.tracking) {
                // Add current coordinates and time
                currentDevice.realTimeTrack.coordinates.push(currentDevice.coordinates);
                currentDevice.realTimeTrack.time.push(currentDevice.time);
                currentDevice.realTimeTrack.positioning.push(currentDevice.radius);
                

                showRealTimeTrack(currentDevice);
            }
        }
    }
};

// Navigation error timer
function navigationErrorTimer(currentDevice) {
    var timerId = setInterval(() => {
            // Hide device marker and stop timer if timer time = 60
            if (currentDevice.navError.timerTime == 60) {
                // Change and write navigation error data for device
                currentDevice.navError.prevState = currentDevice.state;
                
                // Hide device marker
                js_onDeviceState(currentDevice.id, DeviceStateInvisible);
        
                clearInterval(navErrorTimersId[currentDevice.id]);

                delete navErrorTimersId[currentDevice.id];
            }
            // Write current timer time data
            if (currentDevice.navError.timerTime % 10 == 0) {
                
            }
            
            currentDevice.navError.timerTime++;
        }, 1000);

    navErrorTimersId[currentDevice.id] = timerId;
}

/////////////////////////////////////////////////////////////////////
// Device Information
/////////////////////////////////////////////////////////////////////
function js_addDeviceInformation(id, workMode, battery, timeLife, lastEvent, timeUpdate) {
    var currentDevice = isCurrentDevice(id);
    
    if (currentDevice != null) {        
        // Time life conversion
        var tlSeconds = Number(timeLife),
            tlMinutes = Math.floor(tlSeconds / 60),
            tlHours   = Math.floor(tlMinutes / 60),
            tlDays    = Math.floor(tlHours / 24);

        tlSeconds %= 60;
        tlMinutes %= 60;
        tlHours %= 24; 

        var tlResult = `${tlDays > 0 ? tlDays + ' д. ' : ''}${tlHours > 0 ? tlHours + ' ч. ' : ''}${tlMinutes > 0 ? tlMinutes + ' мин. ' : ''}${tlSeconds + ' сек.'}`;

        // Matching last event
        var leResult = "";

        eventsList.forEach((value, key) => {
            if (lastEvent & key) {
                leResult += `${value} <br />`;
            }
        });

        // Time update conversion 
        var updateDate = new Date();
        updateDate.setTime(timeUpdate * 1000);

        var tuSeconds = updateDate.getSeconds(),
            tuMinutes = updateDate.getMinutes(),
            tuHours = updateDate.getHours(),
            tuDay = updateDate.getDate(),
            tuMonth = updateDate.getMonth() + 1,
            tuYear = updateDate.getFullYear();

        var tuResult = `${tuHours}:${tuMinutes > 9 ? tuMinutes : "0" + tuMinutes}:${tuSeconds > 9 ? tuSeconds : "0" + tuSeconds} ${tuDay}.${tuMonth > 9 ? tuMonth : "0" + tuMonth}.${tuYear}`;

        // Device data recording
        var newData = {
            workMode: workMode,
            battery: battery,
            timeLife: tlResult,
            lastEvent: leResult,
            timeUpdate: tuResult
        }

        Object.assign(currentDevice, newData);
         
    }

}

function js_onDeviceKeysRemoved(id) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice != null) { 
        currentDevice.keysRemoved = true;
        
    }   
}

/////////////////////////////////////////////////////////////////////
// Device state
/////////////////////////////////////////////////////////////////////
function js_onDeviceState(id, state) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        currentDevice.state = state;
        

        if (state == DeviceStateInvisible && devMarkers[currentDevice.id]) {
            hideDeviceMarker(currentDevice);
            if (currentDevice.id == currentCircleGSM.id) {
                hideCircleGSM();
            }
        } 
        if (currentDevice.coordinates && state != DeviceStateInvisible && currentDevice.group.devStatus == null)  {
            devIcon = getDeviceIcon(currentDevice); 
            showDeviceMarker(currentDevice, devIcon);
            // Check device selected or not
            if (currentDevice.selected) {
                // GSM circle
                if (currentDevice.radius > 0 ) {    
                    showCircleGSM(currentDevice);
                } else if (currentCircleGSM.circle != null) {
                     hideCircleGSM();
                }
            }
        }    
    }
}

/////////////////////////////////////////////////////////////////////
// Select device and change icon size
/////////////////////////////////////////////////////////////////////
function js_onDeviceSelect(id) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice !== null) {
        var devIcon;

        // Check if the device is selected and the activity of the controlled area editor
        if (selectedMarkerId !== currentDevice.id) {
            js_onDeviceSelectOff();
            ////////////////////////////////////////////////////////////
            // Change the option "selected" and icon of the current 
            // selected group
            if (selectedGroupId !== currentDevice.group.id && currentDevice.group.devStatus !== null) {
                groups[currentDevice.group.id].selected = true;
                    
                selectedGroupId = currentDevice.group.id;
                // Set group name in title
                setTitleGroupName(currentDevice.group.id);
                
                var masterDevice = isCurrentDevice(groups[currentDevice.group.id].masterId);
                
                if (masterDevice !== null) {
                    // Show group icon
                    devIcon = getDeviceIcon(masterDevice);
                    showDeviceMarker(masterDevice, devIcon);
                }
            }
            ////////////////////////////////////////////////////////////
            // Change the option "selected" and icon of the current 
            // selected device
            currentDevice.selected = true;
            // Stop blinking if "event came" is true
            if (currentDevice.eventCame) {
                currentDevice.eventCame = false;
            }

            if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus == null) {
                // Set device icon
                devIcon = getDeviceIcon(currentDevice);
                // Show on the map
                showDeviceMarker(currentDevice, devIcon);
            }
            // Write current marker id 
            selectedMarkerId = currentDevice.id;
            ////////////////////////////////////////////////////////////
            // Set device name in title
            setTitleDeviceName(currentDevice);
            ////////////////////////////////////////////////////////////
            // Hide old track
            if (trackSelectedDevice != null && !currentDevice.track.show) {
                js_removeDeviceTrack();
            }
            ////////////////////////////////////////////////////////////
            // Controlled Area
            // Hide someone else’s controlled area
            if (controlledArea !== null) {
                hideControlledArea();
            }
            // Check controlled area status
            if (currentDevice.controlledArea.bounds.length > 0 && currentDevice.group.devStatus !== Slave) {
                showControlledArea(currentDevice.controlledArea.bounds);
            }
            ////////////////////////////////////////////////////////////
            // GSM radius
            // First: hide previously GSM radius
            if (currentCircleGSM.id !== null && currentCircleGSM.id !== currentDevice.id) {
                hideCircleGSM();
            }
            // Second: show current GSM radius
            if (currentDevice.radius > 0 && currentDevice.group.devStatus !== Slave) {    
                showCircleGSM(currentDevice);
            }
        }
    }
}

function js_onDeviceSelectOff() {
    var icon;
    // Remove device name and group name in title
    titleDevName.innerHTML = '';
    titleGrName.innerHTML = '';
    ////////////////////////////////////////////////////////////
    // Check controlled area edit status of the previous 
    // selected device and change the option "selected" and icon
    if (selectedMarkerId != null) {
        var selectedDevice = isCurrentDevice(selectedMarkerId);

        if (selectedDevice != null) {
            if (selectedDevice.controlledArea.edit) {
                buttonCancelControlledAreaChanges();       
            }

            selectedDevice.selected = false;
            

            if (selectedDevice.coordinates && selectedDevice.state != DeviceStateInvisible && selectedDevice.group.devStatus == null) {
                // Set device icon
                devIcon = getDeviceIcon(selectedDevice);
                // Show on the map
                showDeviceMarker(selectedDevice, devIcon);
            }
        }
    }
    // Rewrite selected marker id
    selectedMarkerId = null;
    ////////////////////////////////////////////////////////////
    // Change the option "selected" and icon of the previous 
    // selected group
    if (selectedGroupId !== null) {
        var masterDevice = isCurrentDevice(groups[selectedGroupId].masterId); 
        
        groups[selectedGroupId].selected = false;

        selectedGroupId = null;

        if (masterDevice !== null) {            
            // Show group icon
            devIcon = getDeviceIcon(masterDevice);
            showDeviceMarker(masterDevice, devIcon);
        }
    }
    // Hide GSM radius
    if (currentCircleGSM.circle != null) {
        hideCircleGSM();
    }
    // Hide track
    if (trackSelectedDevice != null) {
        js_removeDeviceTrack();
    }
    // Hide Controlled Area
    if (controlledArea !== null) {
        hideControlledArea();
    }
}

/////////////////////////////////////////////////////////////////////
// Centering on the selected device
/////////////////////////////////////////////////////////////////////
function js_onDeviceCentering(id) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice !== null) {
        if (currentDevice.group.devStatus !== null) {
            var masterDevice = isCurrentDevice(groups[currentDevice.group.id].masterId);

            if (masterDevice !== null) {
                map.flyTo(masterDevice.coordinates, 18); 
            }
        } else {
            map.flyTo(currentDevice.coordinates, 18);
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Set blinking icon, when device event came
/////////////////////////////////////////////////////////////////////
function js_onDeviceEventCame(id) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        currentDevice.eventCame = true;
        

        if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus == null) {
            devIcon = getDeviceIcon(currentDevice);
            showDeviceMarker(currentDevice, devIcon);       
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Display device track
/////////////////////////////////////////////////////////////////////
function js_addDeviceTrack(id, trackData, r, g, b) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice != null) {
        var trackColor = `rgb(${r}, ${g}, ${b})`,
            mcColor = `rgba(${r}, ${g}, ${b}, 0.7)`,
            mcColorHover = `rgba(${r}, ${g}, ${b}, 0.8)`;
        // Set style for track
        var styleTrack = document.getElementsByTagName('style');
        trackStyle = `.track-point{fill: ${trackColor};}.marker-cluster-track{background-color: ${mcColor}; border-radius: 20px !important;}.marker-cluster-track:hover{background-color: ${mcColorHover};}`;
        styleTrack[0].innerHTML += trackStyle;
        // Style with low opacity
        var styleLowOpacity = `.track-point{fill: ${trackColor}; opacity: 0.3;}.marker-cluster-track{background-color: ${mcColor}; border-radius: 20px !important; opacity: 0.2 !important;}.marker-cluster-track:hover{background-color: ${mcColorHover};}`
        var oldClass = 'track-point';
        var newClass = 'track-point point-opacity';

        pointsGroup = new L.MarkerClusterGroup({
            className: 'marker-cluster-track'
        })
        .on("spiderfied", function(e) {
            // Set low opacity for gpx polyline
            gpxPolyline.setStyle({
                opacity: 0.3
            });
            // Change style for track
            var styleTrackPoint = document.getElementsByTagName('style');
            styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(trackStyle, styleLowOpacity);
            // Set style with high opacity for spiderfied markers 
            e.markers.forEach(el => {
                var newHtml = el.options.icon.options.html.replace(oldClass, newClass);

                var newIcon = L.divIcon({
                    html: newHtml,
                    className: '',
                    popupAnchor: [0, -8]
                  });

                el.setIcon(newIcon);
            })
        })
        .on("unspiderfied", function(e) {
            // Set high opacity for gpx polyline
            gpxPolyline.setStyle({
                opacity: 1
            });
            // Change style for track
            var styleTrackPoint = document.getElementsByTagName('style');
            styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(styleLowOpacity, trackStyle);
            // Set standrat style for unspiderfied markers 
            e.markers.forEach(el => {
                var newHtml = el.options.icon.options.html.replace(newClass, oldClass);

                var newIcon = L.divIcon({
                    html: newHtml,
                    className: '',
                    popupAnchor: [0, -8]
                  });

                el.setIcon(newIcon);
            })
        });
        
        currentDevice.track = {
            show: true,
            trackData: trackData,
            color : {
                r: r,
                g: g,
                b: b
            }
        };
        

        var track = new L.GPX(trackData, {
                          async: false,
                          polyline_options: {
                            color: trackColor
                          }
                        }).on('loaded', function(e) {
                            map.fitBounds(e.target.getBounds());
                        }).addTo(map);

        trackSelectedDevice = {
            id: id,
            track: track
        }
    }
}
 
function js_removeDeviceTrack() {
    var currentDevice = isCurrentDevice(trackSelectedDevice.id);
    
    if (currentDevice != null) {
        currentDevice.track = {
            show: false,
            trackData: null,
            color : {
                r: null,
                g: null,
                b: null
            }
        };
        

        map.removeLayer(trackSelectedDevice.track);
        // Remove track style
        var styleTrackPoint = document.getElementsByTagName('style');
        styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(trackStyle, '');

        trackSelectedDevice = null;
    }
}

/////////////////////////////////////////////////////////////////////
// Real time track
/////////////////////////////////////////////////////////////////////
function js_DeviceRealTimeTrackOn(id, r, g, b) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        // Remove device marker
        if (devMarkers[currentDevice.id]) {
            hideDeviceMarker(currentDevice);
        }
        // Write track point data
        if (currentDevice.coordinates) {
            currentDevice.realTimeTrack.coordinates.push(currentDevice.coordinates);
            currentDevice.realTimeTrack.time.push(currentDevice.time);
            currentDevice.realTimeTrack.positioning.push(currentDevice.radius);
        }
        // Set track style
        var trackColor = `rgb(${r}, ${g}, ${b})`,
            mcColor = `rgba(${r}, ${g}, ${b}, 0.7)`,
            mcColorHover = `rgba(${r}, ${g}, ${b}, 0.8)`;
        // Rewrite track data
        currentDevice.realTimeTrack.tracking = true;   
        currentDevice.realTimeTrack.color = trackColor;
        currentDevice.realTimeTrack.mcColor = mcColor;
        currentDevice.realTimeTrack.mcColorHover = mcColorHover;
        currentDevice.realTimeTrack.className = `track-point-${currentDevice.id}`;
        currentDevice.realTimeTrack.mcClassName = `marker-cluster-${currentDevice.id}`;
        

        // Remove device tracking marker
        if (devMarkers[currentDevice.id]) {
            markersGroup.removeLayer(devMarkers[currentDevice.id]);
            delete devMarkers[currentDevice.id];
        }
        // Check the state of the device
        if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus != Slave) {
            // Set device icon
            devIcon = getDeviceIcon(currentDevice);
            // Show on the map
            showDeviceMarker(currentDevice, devIcon);
        }
    }
}

function js_DeviceRealTimeTrackOff(id) {
    var currentDevice = isCurrentDevice(id);
    
    if (currentDevice != null) {
        if (devRealTimeTracks[currentDevice.id]) {
            // Remove track polyline 
            map.removeLayer(devRealTimeTracks[currentDevice.id].track);
            // Remove track style
            var styleTrackPoint = document.getElementsByTagName('style');
            styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(devRealTimeTracks[currentDevice.id].style, '');

            delete devRealTimeTracks[currentDevice.id];
        }

        // Remove device tracking marker
        if (devMarkers[currentDevice.id]) {
            hideDeviceMarker(currentDevice);
        }
        // Rewrite track data
        currentDevice.realTimeTrack = {
            tracking: false,
            coordinates: [],
            time: [],
            positioning: [],
            color: null,
            mcColor: null,
            mcColorHover: null,
            className: "",
            mcClassName: ""
        }
        

        // Check the state of the device
        if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus != Slave) {
            // Set device icon
            devIcon = getDeviceIcon(currentDevice);
            // Show on the map
            showDeviceMarker(currentDevice, devIcon);
        }
    }
}

// Add real time track on the map
function showRealTimeTrack(currentDevice) {
    if (devRealTimeTracks[currentDevice.id]) {
        // Remove old track 
        map.removeLayer(devRealTimeTracks[currentDevice.id].track);
        
        delete devRealTimeTracks[currentDevice.id];
    }

    var coords = currentDevice.realTimeTrack.coordinates,
        time = currentDevice.realTimeTrack.time,
        positioning = currentDevice.realTimeTrack.positioning,
        trackColor = currentDevice.realTimeTrack.color,
        mcColor = currentDevice.realTimeTrack.mcColor,
        mcColorHover = currentDevice.realTimeTrack.mcColorHover,
        trackClassName = currentDevice.realTimeTrack.className,
        mcClassName = currentDevice.realTimeTrack.mcClassName;
 
    var trackLayerGroup = new L.layerGroup().addTo(map);

    var pointsGroupRLT = new L.MarkerClusterGroup({
        className: mcClassName
    });
    trackLayerGroup.addLayer(pointsGroupRLT);
    
    var polyline = new  L.polyline(coords, {color: trackColor});
    trackLayerGroup.addLayer(polyline);

    // Set the style for track points
    var styleTrackPoint = document.getElementsByTagName('style');
    var trackStyleRT = `.${trackClassName}{fill: ${trackColor};}.${mcClassName}{background-color: ${mcColor}; border-radius: 20px !important;}.${trackClassName}:hover{opacity: 1 !important;}.${mcClassName}:hover{background-color: ${mcColorHover};opacity: 1 !important;z-index: 990 !important;box-shadow: 0 0 10px #000;}`;
    if (styleTrackPoint[0].innerHTML.indexOf(trackClassName) == -1) {
        styleTrackPoint[0].innerHTML += trackStyleRT;
    }
    // Style with low opacity
    var styleLowOpacity = `.${trackClassName}{fill: ${trackColor}; opacity: 0.3;}.${mcClassName}{background-color: ${mcColor}; border-radius: 20px !important; opacity: 0.2 !important;}.${trackClassName}:hover,.${mcClassName}:hover{background-color: ${mcColorHover};opacity: 1 !important;z-index: 990 !important;box-shadow: 0 0 10px #000;}`;
    var oldClass = `${trackClassName}`;
    var newClass = `${trackClassName} point-opacity`;
    // pointsGroupRLT events
    pointsGroupRLT.on("spiderfied", function(e) {
        // Set low opacity for polyline
        polyline.setStyle({
            opacity: 0.3
        });
        // Change style for track
        var styleTrackPoint = document.getElementsByTagName('style');
        styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(trackStyleRT, styleLowOpacity);
        // Write track style data
        devRealTimeTracks[currentDevice.id].style = styleLowOpacity;
        // Set style with high opacity for spiderfied markers 
        e.markers.forEach(el => {
            var newHtml = el.options.icon.options.html.replace(oldClass, newClass);

            var newIcon = L.divIcon({
                html: newHtml,
                className: '',
                popupAnchor: [0, -8]
              });

            el.setIcon(newIcon);
        })
    })
    pointsGroupRLT.on("unspiderfied", function(e) {
        // Set high opacity for gpx polyline
        polyline.setStyle({
            opacity: 1
        });
        // Change style for track
        var styleTrackPoint = document.getElementsByTagName('style');
        styleTrackPoint[0].innerHTML = styleTrackPoint[0].innerHTML.replace(styleLowOpacity, trackStyleRT);
        // Write track style data
        devRealTimeTracks[currentDevice.id].style = trackStyleRT;
        // Set standrat style for unspiderfied markers 
        e.markers.forEach(el => {
            var newHtml = el.options.icon.options.html.replace(newClass, oldClass);

            var newIcon = L.divIcon({
                html: newHtml,
                className: '',
                popupAnchor: [0, -8]
              });

            el.setIcon(newIcon);
        })
    });
    
    // add point
    for (var index = 0; index < coords.length - 1; index++) {
        // Time conversion 
        var coordsDate = new Date();
        coordsDate.setTime(time[index] * 1000);

        var seconds = coordsDate.getSeconds(),
            minutes = coordsDate.getMinutes(),
            hours = coordsDate.getHours(),
            day = coordsDate.getDate(),
            month = coordsDate.getMonth() + 1,
            year = coordsDate.getFullYear();

        var pointDate = `${day}.${month > 9 ? month : "0" + month}.${year}`;
        var pointTime = `${hours}:${minutes > 9 ? minutes : "0" + minutes}:${seconds > 9 ? seconds : "0" + seconds}`;
        var pointPositioning = positioning[index] > 0 ? 'GSM' : 'GPS/GNSS'; 

        var pointView;

        if (pointPositioning == 'GSM') {
            pointView = `<svg style="margin: -3px 0 0 -1px;" width="15" height="15"><polygon class="${trackClassName}" points="7,0 0,14 14,14"/></svg>`;
        } else {
            pointView = `<svg width="11" height="11"><circle class="${trackClassName}" cx="6" cy="5" r="5"/></svg>`;
        }

        var pointIcon = L.divIcon({
            html: pointView,
            className: '',
            popupAnchor: [0, -10]
        });

        var marker = new L.marker(coords[index], {icon: pointIcon})
                              .bindPopup(
                                  `
                                    <b>Координаты:</b> ${coords[index][0]}, ${coords[index][1]} (${pointPositioning}) <br />
                                    <b>Дата:</b> ${pointDate} <br />
                                    <b>Время:</b> ${pointTime} <br />              
                                  `
                              )
                              .on('mouseover', function() {
                                  this.openPopup()
                              })
                              .on('mouseout', function() {
                                  this.closePopup()
                              });
        pointsGroupRLT.addLayer(marker);
    }
    // Save track data
    devRealTimeTracks[currentDevice.id] = {
        track: trackLayerGroup,
        style: trackStyleRT
    };
}

/////////////////////////////////////////////////////////////////////
// Display GPRS 
/////////////////////////////////////////////////////////////////////
function js_onDeviceGPRS(id, show) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        currentDevice.gprs = show;
        

        // Check the state of the device
        if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus == null) {
            // Set device icon
            devIcon = getDeviceIcon(currentDevice);
            // Show on the map
            showDeviceMarker(currentDevice, devIcon);
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Display multimedia 
/////////////////////////////////////////////////////////////////////
function js_onDeviceMultimedia(id, show) {
    var currentDevice = isCurrentDevice(id);
    var devIcon;

    if (currentDevice != null) {
        currentDevice.multimedia = show;
        

        // Check the state of the device
        if (currentDevice.coordinates && currentDevice.state != DeviceStateInvisible && currentDevice.group.devStatus == null) {
            // Set device icon
            devIcon = getDeviceIcon(currentDevice);
            // Show on the map
            showDeviceMarker(currentDevice, devIcon);
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Group
/////////////////////////////////////////////////////////////////////
function js_addGroup(id, name) {
    var newGroup = {
        id: id,
        name: name,
        masterId: null,
        selected: false       
    }

    groups[id] = newGroup;
}

function js_setGroupState(gId, gStatus, masterId, slavesId) {
    var devIcon;
    var gSelected = false;
    ////////////////////////////////////////////////////////////
    // First: ungrouping prev group
    devices.forEach((item) => {
        if (item.group.id == gId && item.group.devStatus !== null) {
            var devStatus = item.group.devStatus;
            // Rewrite device status
            item.group.devStatus = null;
            // Rewrite group master id
            groups[gId].masterId = null;
            // Rewrite selected data
            if (selectedGroupId == gId) {
                titleGrName.innerHTML = '';

                selectedGroupId = null;

                groups[gId].selected = false;
                // Check device selected or not
                if (selectedMarkerId == null) {
                    // Hide GSM radius
                    if (currentCircleGSM.circle != null) {
                        hideCircleGSM();
                    }
                    // Hide track
                    if (trackSelectedDevice != null) {
                        js_removeDeviceTrack();
                    }
                    // Hide Controlled Area
                    if (controlledArea !== null) {
                        hideControlledArea();
                    }
                }
            }
            // Check state and coordinates of the device
            if (item.coordinates && item.state != DeviceStateInvisible) {
                // Set device icon
                devIcon = getDeviceIcon(item);
                // Show on the map
                showDeviceMarker(item, devIcon);
                // Check device selected or not
                if (item.selected) {
                    setTitleDeviceName(item);

                    selectedMarkerId = item.id;

                    if (devStatus == Slave) {
                        // Controlled Area
                        // First: check array bounds
                        if (item.controlledArea.bounds.length > 0) {
                            showControlledArea(item.controlledArea.bounds);
                        }
                        // Second: check edit status
                        if (item.controlledArea.edit) {
                            js_onDeviceControlledAreaEdit(item.id);
                        }
                        // GSM circle
                        if (item.radius > 0 ) {    
                            showCircleGSM(item);
                        }
                    }
                }
            }
        }
    })
    ////////////////////////////////////////////////////////////
    // Second: grouping new group
    if (gStatus !== GroupStatusUnassembled) {
        // Write master id
        groups[gId].masterId = masterId;
        ////////////////////////////////////////////////////////////
        // Set parameters for slaves devices
        slavesId.forEach((item) => {
            var slaveDevice = isCurrentDevice(item);

            if (slaveDevice !== null) {
                slaveDevice.group.devStatus = Slave;    

                if (slaveDevice.selected) {
                    // Write group selected status
                    groups[gId].selected = true;

                    selectedGroupId = gId;
                    
                    setTitleGroupName(gId);

                    setTitleDeviceName(slaveDevice);

                    if (controlledArea !== null) {
                        hideControlledArea();
                    }

                    if (currentCircleGSM.id !== null) {
                        hideCircleGSM();
                    }
                }

                if (slaveDevice.coordinates && slaveDevice.state !== DeviceStateInvisible) {
                    hideDeviceMarker(slaveDevice);
                }
            }
        })
        ////////////////////////////////////////////////////////////
        // Set parameters for master device
        var masterDevice = isCurrentDevice(masterId);

        if (masterDevice !== null) {
            masterDevice.group.devStatus = Master; 

            if (masterDevice.selected) {
                // Write group selected status
                groups[gId].selected = true;

                selectedGroupId = gId;
                
                setTitleGroupName(gId);

                setTitleDeviceName(masterDevice);
            }

            // Show group icon
            devIcon = getDeviceIcon(masterDevice);
            showDeviceMarker(masterDevice, devIcon);
        }
        ////////////////////////////////////////////////////////////
        // Draw controlled area and gsm radius
        if (groups[gId].selected && selectedMarkerId == null) {
            // Controlled Area
            // First: check array bounds
            if (masterDevice.controlledArea.bounds.length > 0) {
                showControlledArea(masterDevice.controlledArea.bounds);
            }
            // Second: check edit status
            if (masterDevice.controlledArea.edit) {
                js_onDeviceControlledAreaEdit(masterDevice.id);
            }
            // GSM circle
            if (masterDevice.radius > 0 ) {    
                showCircleGSM(masterDevice);
            }
        }
    } 
}

function js_groupSelect(id) {
    var currentGroup = groups[id];

    js_onDeviceSelectOff();
    ////////////////////////////////////////////////////////////
    // Rewrite group data
    currentGroup.selected = true;

    selectedGroupId = id;
    ////////////////////////////////////////////////////////////
    // Show group icon
    var masterDevice = isCurrentDevice(currentGroup.masterId);
    
    if (masterDevice !== null) {
        devIcon = getDeviceIcon(masterDevice);
        showDeviceMarker(masterDevice, devIcon); 
    }
    ////////////////////////////////////////////////////////////
    // Set group name in title
    setTitleGroupName(id);
    ////////////////////////////////////////////////////////////
    // Hide old track
    if (trackSelectedDevice != null && !masterDevice.track.show) {
        js_removeDeviceTrack();
    }
    ////////////////////////////////////////////////////////////
    // Controlled Area
    // Hide someone else’s controlled area
    if (controlledArea !== null) {
        hideControlledArea();
    }
    // Check controlled area status
    if (masterDevice.controlledArea.bounds.length > 0) {
        showControlledArea(masterDevice.controlledArea.bounds);
    }
    ////////////////////////////////////////////////////////////
    // GSM radius
    // First: hide previously GSM radius
    if (currentCircleGSM.id !== null && currentCircleGSM.id !== masterDevice.id) {
        hideCircleGSM();
    }
    // Second: show current GSM radius
    if (masterDevice.radius > 0) {    
        showCircleGSM(masterDevice);
    }
}

/////////////////////////////////////////////////////////////////////
// Set bounds of Controlled Area  
/////////////////////////////////////////////////////////////////////
function js_onDeviceControlledAreaState(id, state, latA, lonA, latB, lonB) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice != null) {
        // Check state: set, normal
        if (state == PrmStateNorm || state == PrmStateSet) {
            // Check coordinate values
            if (latA == 0 && lonA == 0 && latB == 0 && lonB == 0) {
                removeControlledArea(currentDevice.id);
            } else {
                var areaBounds = [[latA, lonA], [latB, lonB]];

                // Write controlled area data
                currentDevice.controlledArea.bounds = areaBounds;
                if (state == PrmStateSet && currentDevice.controlledArea.confirmed) {
                    currentDevice.controlledArea.confirmed = false;
                }
                if (state == PrmStateNorm && !currentDevice.controlledArea.confirmed) {
                    currentDevice.controlledArea.confirmed = true;
                }

                // Show new Controlled Area
                if (selectedMarkerId === currentDevice.id && !currentDevice.controlledArea.edit) {
                    if (controlledArea !== null) {
                        hideControlledArea();
                    }

                    showControlledArea(areaBounds);
                    // Redraw GSM circle
                    if (currentDevice.radius > 0) {
                        showCircleGSM(currentDevice);
                    }
                }  
            }
        }
        // Check state: unknown
        if (state == PrmStateUnk) {
            if (currentDevice.controlledArea.confirmed) {
                currentDevice.controlledArea.confirmed = false;
            }
            

            if (controlledArea !== null && selectedMarkerId === currentDevice.id && !currentDevice.controlledArea.edit) {
                hideControlledArea();

                showControlledArea(currentDevice.controlledArea.bounds);
            }
        }
        // Check state: error
        if (state == PrmStateErr) {
            removeControlledArea(currentDevice.id);
        }
    }
}

/////////////////////////////////////////////////////////////////////
// Edit Controlled Area
/////////////////////////////////////////////////////////////////////
function js_onDeviceControlledAreaEdit(id) {
    var currentDevice = isCurrentDevice(id);  

    if (currentDevice != null) {
        currentDevice.controlledArea.edit = true;
        

        if (controlledArea === null) {
            // Get the current north-east coordinates of the map bounds
            var mapBounds = map.getBounds();
            var latMB = mapBounds.getNorthEast().lat;
            var lngMB = mapBounds.getNorthEast().lng;
            // Get the current coordinates of the map center    
            var mapCenter = map.getCenter();
            var latMC = mapCenter.lat;
            var lngMC = mapCenter.lng;
            // Calculation controlled area bounds coordinates
            var x = (Number(latMB) - Number(latMC)) / 2;
            var y = (Number(lngMB) - Number(lngMC)) / 2;
            var latSW = Number(latMC) - Number(x);
            var lngSW = Number(lngMC) - Number(y);
            var latNE = Number(latMC) + Number(x); 
            var lngNE = Number(lngMC) + Number(y);
             
            var areaBounds = [[latSW, lngSW], [latNE, lngNE]];

            showControlledArea(areaBounds);
        } else {
            // Get the current coordinates of the controlled area bounds  
            var areaBounds = currentDevice.controlledArea.bounds;
            var latASW = currentDevice.controlledArea.bounds[0][0];
            var lngASW = currentDevice.controlledArea.bounds[0][1];
            var latANE = currentDevice.controlledArea.bounds[1][0];
            var lngANE = currentDevice.controlledArea.bounds[1][1];
            // Calculation map bounds coordinates
            var x = (Number(latANE) - Number(latASW)) / 2;
            var y = (Number(lngANE) - Number(lngASW)) / 2;
            var latMSW = Number(latASW) - Number(x);
            var lngMSW = Number(lngASW) - Number(y);
            var latMNE = Number(latANE) + Number(x); 
            var lngMNE = Number(lngANE) + Number(y);
   
            areaBounds = [[latMSW, lngMSW], [latMNE, lngMNE]];

            map.fitBounds(areaBounds);
            // Redraw Controlled Area
            hideControlledArea();
            showControlledArea(currentDevice.controlledArea.bounds);
        }
        // Show edit mode
        controlledArea.enableEdit();
        document.getElementById('editMode').style.display = 'block';  

        // Set style for editable controlled area
        document.getElementsByClassName('controlled-area')[0].style.cursor = 'move';
        controlledArea.setStyle({ dashArray: '10, 10' });         
    }
}

// Show/hide controlled area
function showControlledArea(areaBounds) {
    var currentDevice;

    if (selectedGroupId !== null) {
        currentDevice = isCurrentDevice(groups[selectedGroupId].masterId);    
    } else {
        currentDevice = isCurrentDevice(selectedMarkerId);
    }

    if (currentDevice != null) {
        var dash = currentDevice.controlledArea.confirmed ? '' : '10, 10';

        controlledArea = L.rectangle(areaBounds, {
            className: 'controlled-area',
            color: 'red',
            dashArray: dash,
            fillColor: '#C71FC2',
            fillOpacity: 0.5
        }).addTo(map);
        // Set style for controlled area
        document.getElementsByClassName('controlled-area')[0].style.cursor = 'default';
    }
}

function hideControlledArea() {
    map.removeLayer(controlledArea);
    controlledArea = null;
}

// Remove Controlled Area
function removeControlledArea(id) {
    var currentDevice = isCurrentDevice(id);

    if (currentDevice != null) {
        // Rewrite controlled area data
        currentDevice.controlledArea = {
            edit: false,
            confirmed: false,
            bounds: []
        }
        

        if (controlledArea !== null && selectedMarkerId === currentDevice.id && !currentDevice.controlledArea.edit) {
            hideControlledArea();
        }
    }
}

// Send changed coordinates of the controlled area (button in edit mode)
function buttonSendControlledAreaCoordinates() {
    currentDevice = isCurrentDevice(selectedMarkerId);

    if (currentDevice != null) {
        // Get the current coordinates of the controlled area bounds 
        var areaBounds = controlledArea.getBounds();
        var latSW = areaBounds.getSouthWest().lat;
        var lngSW = areaBounds.getSouthWest().lng;
        var latNE = areaBounds.getNorthEast().lat;
        var lngNE = areaBounds.getNorthEast().lng;
        // Send area coordinates for confirmation
        nativeObj.onMapControlledAreaCoordinates(selectedMarkerId, latSW, lngSW, latNE, lngNE);
        // Write Controlled Area data
        var areaBounds = [[latSW, lngSW], [latNE, lngNE]]; 

        // Rewrite controlled area data
        currentDevice.controlledArea = {
            edit: false,
            confirmed: false,
            bounds: areaBounds
        }
        
        // Redraw GSM circle
        if (currentDevice.radius > 0) {
            showCircleGSM(currentDevice);
        }
        // Hide edit mode
        controlledArea.disableEdit();
        document.getElementById('editMode').style.display = 'none';
        // Set style for controlled area
        document.getElementsByClassName('controlled-area')[0].style.cursor = 'default';
    }
}

// Cancel controlled area changes (button in edit mode)
function buttonCancelControlledAreaChanges() {
    currentDevice = isCurrentDevice(selectedMarkerId);

    if (currentDevice != null) {
        // Rewrite controlled area data
        currentDevice.controlledArea.edit = false;
        

        hideControlledArea();
        
        if (currentDevice.controlledArea.bounds.length > 0) {
            showControlledArea(currentDevice.controlledArea.bounds);
            // Redraw GSM circle
            if (currentDevice.radius > 0) {
                showCircleGSM(currentDevice);
            }
        }
        // Send signal about cancel editing
        nativeObj.onMapControlledAreaEditCancel();       
        // Hide edit mode
        document.getElementById('editMode').style.display = 'none';
        // Set style for controlled area
        if (document.getElementsByClassName('controlled-area')[0]) {
            document.getElementsByClassName('controlled-area')[0].style.cursor = 'default';
        }
    }
}

// Remove Controlled Area (button in edit mode)
function buttonRemoveControlledArea() {
    currentDevice = isCurrentDevice(selectedMarkerId);

    if (currentDevice != null) {
        // Rewrite controlled area data
        currentDevice.controlledArea.edit = false;
        

        hideControlledArea();

        if (currentDevice.controlledArea.bounds.length > 0) {
            showControlledArea(currentDevice.controlledArea.bounds);
            // Redraw GSM circle
            if (currentDevice.radius > 0) {
                showCircleGSM(currentDevice);
            }
            // Send signal about removing area
            nativeObj.onMapControlledAreaCoordinates(selectedMarkerId, 0, 0, 0, 0);
        } else {
            // Send signal about cancel editing
            nativeObj.onMapControlledAreaEditCancel();
        }
        // Hide edit mode
        document.getElementById('editMode').style.display = 'none';
        // Set style for controlled area
        if (document.getElementsByClassName('controlled-area')[0]) {
            document.getElementsByClassName('controlled-area')[0].style.cursor = 'default';
        }
    }
}

// Show/hide device marker on the map
function showDeviceMarker(currentDevice, devIcon) {
    // Check if the device is on the map
    if (devMarkers[currentDevice.id]) {
        hideDeviceMarker(currentDevice);
    }

    var marker = L.marker(currentDevice.coordinates, {icon: devIcon})
        .bindPopup(function() {
            if (currentDevice.group.devStatus !== Master) {
                // Show device info
                var workMode = "";

                if (currentDevice.type != DevTypePhone && 
                    currentDevice.type != DevTypeTablet &&
                    currentDevice.type != DevTypeNotebook) {
                    workMode = `<b>Режим работы:</b> ${currentDevice.workMode ? currentDevice.workMode : ""}<br />`;
                }

                var info = `
                    <div class="device-popup-header">
                        <span class="device-popup-keys">${currentDevice.keysRemoved ? "Ключи удалены!" : ""}</span>
                        <b>${currentDevice.name}</b>
                        <b>${currentDevice.address ? currentDevice.address : ""}</b>
                    </div><br />
                    ${workMode}
                    <b>Заряд батареи:</b> ${currentDevice.battery ? currentDevice.battery : ""}<br />
                    <b>Время устройства:</b> ${currentDevice.timeLife ? currentDevice.timeLife : ""}<br />
                    <b>Обновлено:</b> ${currentDevice.timeUpdate ? currentDevice.timeUpdate : ""}<br />
                    <div class="device-popup-events">
                        <b>Последнее событие:</b>
                        <div style="margin-left: 0.5em;">${currentDevice.lastEvent ? currentDevice.lastEvent : ""}</div>
                    </div>                
                `;
                return info;
            } else {
                // Show device list in popup
                var info = '<b>' + currentDevice.name + '</b><br />';

                devices.forEach(item => {
                    if (item.group.id == currentDevice.group.id && item.group.devStatus !== null) {
                        if (item.id != currentDevice.id) {
                            info += item.name + '<br />';
                        }   
                    }
                });

                return info; 
            }
        })
        .on('mouseover', function() {
            this.openPopup()
        })
        .on('mouseout', function() {
            this.closePopup()
        })
        .on('click', function() {
            var devIcon;
            // Checks for Click 
            var checkOne = false;
            var checkTwo = false;

            if (currentDevice.group.devStatus == null && selectedMarkerId !== currentDevice.id) {
                checkOne = true;
            }

            if (currentDevice.group.devStatus == Master) {
                if (selectedMarkerId !== null && selectedGroupId == currentDevice.group.id) {
                    checkTwo = true;
                }

                if (selectedGroupId !== currentDevice.group.id) {
                    checkTwo = true;
                }
            }
            // Controlled area status
            var editStatus = false;

            if (selectedMarkerId !== null) {
                editStatus = devices.find(item => item.id == selectedMarkerId).controlledArea.edit;
            }
            ////////////////////////////////////////////////////////////
            // Check if the device is selected and the activity of the controlled area editor
            if ((checkOne || checkTwo) && !editStatus) {
                ////////////////////////////////////////////////////////////
                // Send group id to select it in the list
                if (currentDevice.group.devStatus == Master && selectedGroupId !== currentDevice.group.id) {          
                    nativeObj.onMapSelectedGroup(currentDevice.group.id);
                }
                ////////////////////////////////////////////////////////////
                // Unselect all
                js_onDeviceSelectOff();
                ////////////////////////////////////////////////////////////
                // Group: Change the option "selected" and icon of the current 
                // selected group
                if (selectedGroupId !== currentDevice.group.id && currentDevice.group.devStatus == Master) {
                    groups[currentDevice.group.id].selected = true;

                    selectedGroupId = currentDevice.group.id;

                    // Set group name in title
                    setTitleGroupName(currentDevice.group.id);
                    // Show group icon
                    devIcon = getDeviceIcon(currentDevice);
                    showDeviceMarker(currentDevice, devIcon);
                }
                ////////////////////////////////////////////////////////////
                // Device: Change the option "selected" and icon of the current 
                // selected device
                if (currentDevice.group.devStatus == null) {
                    currentDevice.selected = true;
                    // Stop blinking if "event came" is true
                    if (currentDevice.eventCame) {
                        currentDevice.eventCame = false;
                    }
                    
                    // Set device icon
                    devIcon = getDeviceIcon(currentDevice);
                    // Show on the map
                    showDeviceMarker(currentDevice, devIcon);
                    // Write current marker id 
                    selectedMarkerId = currentDevice.id;
                    ////////////////////////////////////////////////////////////
                    // Set device name in map title
                    setTitleDeviceName(currentDevice);
                    ////////////////////////////////////////////////////////////
                    // Send device id to select it in the list
                    nativeObj.onMapSelectedDevice(currentDevice.id);
                }
                ////////////////////////////////////////////////////////////
                // Hide old track
                if (trackSelectedDevice != null && !currentDevice.track.show) {
                    js_removeDeviceTrack();
                }
                ////////////////////////////////////////////////////////////
                // Controlled Area
                // Hide someone else’s controlled area
                if (controlledArea !== null) {
                    hideControlledArea();
                }
                // Check controlled area status
                if (currentDevice.controlledArea.bounds.length > 0) {
                    showControlledArea(currentDevice.controlledArea.bounds);
                }
                ////////////////////////////////////////////////////////////
                // GSM radius
                // First: hide previously GSM radius
                if (currentCircleGSM.id !== null && currentCircleGSM.id !== currentDevice.id) {
                    hideCircleGSM();
                }
                // Second: show current GSM radius
                if (currentDevice.radius > 0) {    
                    showCircleGSM(currentDevice);
                }
            }
        })
    
    // Check tracking status and add marker to the correct layer
    if (!currentDevice.realTimeTrack.tracking) {
        markersGroup.addLayer(marker);
    } else {
        map.addLayer(marker);
    }
    // Write marker data
    devMarkers[currentDevice.id] = marker;
    // Write current marker id 
    if (currentDevice.selected) {
        selectedMarkerId = currentDevice.id;
    }
};

function hideDeviceMarker(currentDevice) {
    // Check tracking status and remove marker from the correct layer
    if (!currentDevice.realTimeTrack.tracking) {
        markersGroup.removeLayer(devMarkers[currentDevice.id]);
    } else {
        map.removeLayer(devMarkers[currentDevice.id]);
    }
    
    delete devMarkers[currentDevice.id];
};

// Device icon
function getDeviceIcon(currentDevice) {
    var state = currentDevice.state;
    var icon;
    var iconSize;
    var iconAnchor = "";
    var className = classMarkerIcon;
    var iconHtml = "";
    var popupAnchor = "";

    // Check device tracking status
    if (!currentDevice.realTimeTrack.tracking) {
        ////////////////////////////////////////////////
        // Set correct icon
        ///////////////////////////////////////////////
        if (currentDevice.group.devStatus !== Master) {
            icon = iconsList.get(currentDevice.type);
        
            if (icon.indexOf('.svg') == -1 && icon.indexOf('.png') == -1) {
                switch (state) {
                    case DeviceStateOk:
                        icon += iconGreen;
                        break;
                    case DeviceStateGray:
                        icon += iconGray;
                        break;
                    case DeviceStateRed:
                        icon += iconRed;
                        break;
                    default:
                        alert( "Нет таких значений" );   
                }
            }
            ///////////////////////////////////////////////
            // Check the option "selected"
            if (currentDevice.selected) {
                // Set icon size
                iconSize = iconSizeSelected;
                // Set popup anchor
                popupAnchor = [0, -18];
            } else {
                // Set icon size
                iconSize = iconSizeStandart;
                // Set popup anchor
                popupAnchor = [0, -13];
            }
        } else {
            icon = groupIcon;
            ///////////////////////////////////////////////
            // Check the option "selected"
            if (groups[currentDevice.group.id].selected) {
                // Set icon size
                iconSize = iconSizeSelected;
                // Set popup anchor
                popupAnchor = [0, -18];
            } else {
                // Set icon size
                iconSize = iconSizeStandart;
                // Set popup anchor
                popupAnchor = [0, -13];
            }
        }
        ///////////////////////////////////////////////
        // Check GPRS status
        ///////////////////////////////////////////////
        if (currentDevice.gprs) {
            iconHtml += '<img src=' + gprsIcon + ' class="marker-gprs">';
        }
        ///////////////////////////////////////////////
        // Check multimedia status
        ///////////////////////////////////////////////
        if (currentDevice.multimedia) {
            iconHtml += '<img src=' + playIcon + ' class="marker-play">'
        }
    } else {
        ///////////////////////////////////////////////
        // Set correct icon
        ///////////////////////////////////////////////
        if (currentDevice.group.devStatus !== Master) {
            icon = iconsTracking.get(currentDevice.type);
            ///////////////////////////////////////////////
            // Check the option "selected"
            if (currentDevice.selected) {
                // Set icon size
                iconSize = iconSizeSelectedTrk;
                // Set icon anchor
                iconAnchor = [26.5, 49];
                // Set popup anchor
                popupAnchor = [0, -47];
            } else {
                // Set icon size
                iconSize = iconSizeStandartTrk;
                // Set icon anchor
                iconAnchor = [19, 36];
                // Set popup anchor
                popupAnchor = [0, -35];
            }
        } else {
            icon = grTrackingIcon;
            ///////////////////////////////////////////////
            // Check the option "selected"
            if (groups[currentDevice.group.id].selected) {
                // Set icon size
                iconSize = iconSizeSelectedTrk;
                // Set icon anchor
                iconAnchor = [26.5, 49];
                // Set popup anchor
                popupAnchor = [0, -47];
            } else {
                // Set icon size
                iconSize = iconSizeStandartTrk;
                // Set icon anchor
                iconAnchor = [19, 36];
                // Set popup anchor
                popupAnchor = [0, -35];
            }
        }

        className = classMarkerIconTrk;
        ///////////////////////////////////////////////
        // Check GPRS status
        ///////////////////////////////////////////////
        if (currentDevice.gprs) {
            iconHtml += '<img src=' + gprsIcon + ' class="marker-trk-gprs">';
        }
        ///////////////////////////////////////////////
        // Check multimedia status
        ///////////////////////////////////////////////
        if (currentDevice.multimedia) {
            iconHtml += '<img src=' + playIcon + ' class="marker-trk-play">'
        }      
    }    

    iconHtml += '<img src=' + icon + ' class="marker-img">';
    
    // Set className
    if (currentDevice.eventCame) {
        className += ' ' + classEventCame;
    }

    var devIcon = new L.DivIcon({ 
        html: iconHtml,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        className: className,
        popupAnchor: popupAnchor
    });

    return devIcon;
}


// Search for the desired device
function isCurrentDevice(id) {
    var index = devices.findIndex((item) => {return item.id == id});
    
    if (index == -1) {
        return null;
    }

    return devices[index];
}

// Coordinate Display GSM
function showCircleGSM(currentDevice) {
    // Hide current circle GSM
    if (currentCircleGSM.circle !== null) {
        hideCircleGSM();
    }

    if (currentDevice.state !== DeviceStateInvisible) {
        currentCircleGSM.circle = L.circle(currentDevice.coordinates, {
                                    className: 'circle-gsm',
                                    color: '',
                                    fillColor: "lightgreen",
                                    fillOpacity: 0.5,
                                    radius: currentDevice.radius
                                }).addTo(map);

        currentCircleGSM.id = currentDevice.id;
    }
}

function hideCircleGSM() {
    map.removeLayer(currentCircleGSM.circle);
    
    currentCircleGSM = {
        id: null,
        circle: null
    };
}

// Set title device name on the map
function setTitleDeviceName(currentDevice) {
    var deviceName = currentDevice.name;
    
    if (deviceName.length > 20) {
        titleDevName.innerHTML = deviceName.substr(0, 20) + '...';
    } else {
        titleDevName.innerHTML = deviceName;
    }
}

// Set title group name on the map
function setTitleGroupName(id) {
    var groupName = null;
    
    if (groups[id]) {
        groupName = groups[id].name;
    }

    if (groupName !== null) {
        if (groupName.length > 20) {
            groupName = groupName.substr(0, 20) + '...';
        }

        titleGrName.innerHTML = groupName;
    }
}