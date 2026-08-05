import { Slide, Zoom, toast } from "react-toastify"

export const InfoToast = (message)=>
{
    return toast.info(message,{className:'info-toast',closeButton:false,autoClose:500,hideProgressBar:true,position:'bottom-right',icon:false,containerId:'info-toast',transition:Slide})
}

export const ErrorToast = (message)=>
{
    return toast.error(message,{className:'error-toast',closeButton:false,autoClose:500,hideProgressBar:true,position:'bottom-right',icon:false,containerId:'error-toast',transition:Slide})
}