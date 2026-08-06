import React, { useCallback, useState } from 'react'
import { Autocomplete, GoogleMap, Marker, StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api';
import { SearchInput } from '@cocarr/ui';

const containerStyle = {
    width: '100%',
    height: '160px'
  };
  
  const center = {
    lat: -3.745,
    lng: -38.523
  };

  const mapConfig = {
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyB-Pv1rXNAMgsckYvHMJMAuDDDbgwgR1o4",
    libraries:[['places']]
  }
  
  
  export default function Map({setLocation,defaultLocation=center}) {
    

    const [position,setPosition] = useState({lat:defaultLocation ? parseFloat(defaultLocation.lat) :  13.0827,lng: defaultLocation ? parseFloat(defaultLocation.lng) :  80.2707});
    
    let searchBox = null;

    const [markers,setMarkers] = useState([{position:position}])
    const [searchResult,setSearchResult] = useState(null)
    const { isLoaded } = useJsApiLoader(mapConfig)

    const [map, setMap] = useState(null)

    function onLoad(autocomplete){
      setSearchResult(autocomplete)
        console.log(autocomplete)

    setMap(map)
    }
    const onSearchLoad = ref => {
      console.log('ref',ref)
      searchBox = ref;
    }

    const onUnmount = useCallback(function callback(map) {
    setMap(null)
    }, [])
    
    const onPlacesChanged = ()=>
    {
      if (searchResult != null) {
        const place = searchResult.getPlace();
        console.log('placei d',place.geometry.location.lat())
        setMarkers([{position:{lat:place.geometry.location.lat(),lng:place.geometry.location.lng()}}])
        setPosition({lat:place.geometry.location.lat(),lng:place.geometry.location.lng()})
        setLocation(place.geometry.location.lat(),place.geometry.location.lng())
      } else {
        alert("Please enter text");
      }
    }

    const onMarkerDragged = (e)=>
    {
      setLocation(e.latLng.lat(),e.latLng.lng())
      // setMarkers({position:{lat:e.latLng.lat(),lng:e.latLng.lng()}}
    }

  return isLoaded ? (
    <div className='rounded-md overflow-hidden'>
      <GoogleMap
      mapContainerStyle={containerStyle}
      center={position}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount} 
      onClick={(e)=>{setMarkers([{position:{lat:e.latLng.lat(),lng:e.latLng.lng()}}]);setLocation(e.latLng.lat(),e.latLng.lng())}}
      options={{clickableIcons:false,mapTypeControl:false,controlSize:22,streetViewControl:false,fullscreenControl:false}}>
        <div>
          {
            markers.map((item,index)=>{
              return  <Marker draggable={true} key={index} onDragEnd={(e)=>onMarkerDragged(e)} onLoad={onLoad} position={item.position} />
            })
          }
        <Autocomplete id="google-searchbox"
      onLoad={onLoad}
      onPlaceChanged={onPlacesChanged}>
      <input
        type="text"
        placeholder="Search Place"
        style={{
          boxSizing: `border-box`,
          width: `160px`,
          height: `32px`,
          padding: `0 12px`,
          borderRadius: `4px`,
          //   boxShadow: `0 2px 6px rgba(0, 0, 0, 0.05)`,
          fontSize: `13px`,
          outline: `none`,
          textOverflow: `ellipses`,
          backgroundColor:'rgba(255,255,255,0.9)',
          position: "absolute",
          right: '12px',
          top:"12px",
          marginLeft: "-120px"
        }}
      />
    </Autocomplete>
        </div>
    </GoogleMap></div>
) : <></>
}
