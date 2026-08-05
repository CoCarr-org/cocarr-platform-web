import { clsx } from "clsx"
import moment from "moment/moment";
import { twMerge } from "tailwind-merge"

async function dataURItoBlob(url){
    return await (await fetch(url)).blob()
}


export function getCurrentTimeRounded() {
  const now = moment();
  const hours = now.hours();
  const minutes = now.minutes();

  // Calculate the rounded hours
  let roundedHours = hours + 3;

  // If the minutes are greater than or equal to 30, round up to the next hour
  if (minutes >= 30) {
      roundedHours += 1;
  }

  // If the rounded hours exceed 24, set it back to 0 (midnight) and add 1 to the day
  if (roundedHours >= 24) {
      roundedHours -= 24;
      now.add(1, 'days');
  }

  // Set the rounded hours and reset minutes, seconds, and milliseconds
  now.hours(roundedHours);
  now.minutes(0);
  now.seconds(0);
  now.milliseconds(0);

  return now.toDate();
}


export function getDateFormat(date) {
    const inputDate = new Date(date);
  
    const day = String(inputDate.getDate()).padStart(2, "0");
    const month = String(inputDate.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so add 1
    const year = inputDate.getFullYear();
  
    return `${day}-${month}-${year}`;
  }


export function calculateAge(birthDate) {
    // Parse the birthDate string into a Date object
    const dob = new Date(birthDate);
    
    // Get the current date
    const currentDate = new Date();
    
    // Calculate the difference in milliseconds between the current date and the birthDate
    const diffMs = currentDate - dob;
    
    // Convert the difference in milliseconds to years
    const ageDate = new Date(diffMs); // Epoch reference
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    return age;
}


export function getValidDateFormat(date) {
    const inputDate = new Date(date);
  
    const day = String(inputDate.getDate()).padStart(2, "0");
    const month = String(inputDate.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so add 1
    const year = inputDate.getFullYear();
  
    return `${year}-${month}-${day}`;
  }

  export const convertStringToArray = (commaSeparatedString) => {
    if (!commaSeparatedString) return [];
    return commaSeparatedString.split(',');
  };
  
  export function getDateTimeFormat(date) {
    const inputDate = new Date(date);

    const day = String(inputDate.getDate()).padStart(2, "0");
    const month = String(inputDate.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so add 1
    const year = inputDate.getFullYear();

    const hours = inputDate.getHours();
    const minutes = inputDate.getMinutes();
    const amPm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${year}-${month}-${day} ${formattedHours}:${formattedMinutes} ${amPm}`;
}
  export function getTimeFormat(date) {
    const inputDate = new Date(date);

    const hours = inputDate.getHours();
    const minutes = inputDate.getMinutes();
    const amPm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${amPm}`;
}

function base64ToBlob(base64, mime) 
{
    mime = mime || 'image/jpeg';
    var sliceSize = 1024;
    var byteChars = window.atob(base64);
    var byteArrays = [];

    for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
        var slice = byteChars.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: mime});
}


export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export {dataURItoBlob,base64ToBlob}
