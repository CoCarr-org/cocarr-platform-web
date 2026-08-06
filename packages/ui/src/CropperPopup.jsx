import React, { useRef, useState } from 'react'
import { Cropper } from 'react-cropper';
import "cropperjs/dist/cropper.css";
import { IoCloseSharp } from 'react-icons/io5';

export default function ProfileImage({uploadedFile,onUpload,onClose,setUploading,uploading}) {

    const cropperRef = useRef(null);
    const [cropperInstance,setCropperInstance] = useState(null)
    const getCropData = async () => {
        // e.preventDefault();
        if (cropperInstance) {
          const file = await fetch(cropperInstance.getCroppedCanvas().toDataURL())
            .then((res) => res.blob())
            .then((blob) => {
              return new File([blob], "newAvatar.png", { type: "image/png" });
            });
          if (file) {
            await onUpload(file)
            setUploading(false)
          }
        }
      };

  return (
    <div className='bg-black bg-opacity-70 fixed z-[999] w-[100%] h-full left-0 top-0 flex justify-center items-center overflow-scroll py-2'>
    <div className='w-[520px] max-w-full bg-white   top-0 h-auto right-[320px] rounded-md overflow-hidden'>
        <div className='flex px-8 py-4 justify-between items-center border-b-2 border-gray-100 bg-[#fff]'>
            <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>Upload Image</h3>
            <div className='bg-gray-100 px-2 py-2 rounded-md hover:bg-gray-200 transition-all cursor-pointer' onClick={()=>onClose(false)}>
              <IoCloseSharp className='w-5 h-5'/>
            </div>
        </div>
        <div className='flex px-8 py-6 w-full '>
        <div className='bg-[#fafafa] rounded-md overflow-hidden h-[380px] w-full'>
        <Cropper
        className='w-full h-[420px]'
        ref={cropperRef}
        src={uploadedFile}
        // aspectRatio={16 / 9}
        minCropBoxHeight={240}

        // minCropBoxWidth={420}
        guides={false}
        checkOrientation={false}
        onInitialized={(instance) => {
            setCropperInstance(instance);
        }}
        />
        </div>
        </div>
        <div className='flex justify-end mt-4 px-8 py-4  bg-[#fafafa] border-t-2 border-gray-50'>
            <button type='button' className='btn-md-disabled' onClick={()=>onClose(false)}>Cancel</button>
            <button onClick={()=>getCropData()} type='button' className="ml-4 btn-md disabled:bg-[#d3d3d3] disabled:text-[#a3a3a3]" disabled={uploading}>{uploading ? 'Uploading' : 'Upload'}</button>
        </div>
    </div>
</div>
  )
}
