import React, { useState } from 'react';
import { toast } from 'react-toastify';
import CropperPopup from './CropperPopup';
import AuthAxios from '../helpers/axios';
import axios from 'axios';

const CarImageInfoUploader = ({ setImage ,name='uploader',setError,getCarInfo,vehicleId}) => {
  const [uploading,setUploading] = useState(false)
  const [file,setFile] = useState(null)

  const handleImageChange = async(event) => {
    try {
        
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setFile(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
        toast.error('Error Uploading Image')
        setError(error?.response?.data?.message ? error?.response?.data?.message : 'Error Uploading Image')
        return 
    }
  };

  const handleUpload = async(file) => {
    try {
      if (file) {
        setUploading(true)
        let urlRes = await AuthAxios.get(`/image/url`, { params: { folder: 'vehicle' } })

        const formData = new FormData();
        Object.entries(urlRes.data.fields).forEach(([field, value]) => {
            formData.append(field, value);
          });
          formData.append('acl', 'public-read');
        formData.append('file', file);
        let res = await axios.post(urlRes.data.url, formData)
        let profileRes = await AuthAxios.put(`/vehicle/add-photo/${vehicleId}`, {url:`${urlRes.data.url}${urlRes.data.fields.key}`})
        await getCarInfo();
        setFile(null)
            setUploading(false)
    }
    } catch (error) {
        toast.error('Error Uploading Image')
        // setError(error?.response?.data?.message ? error?.response?.data?.message : 'Error Uploading Image')
        console.log('error',error)
        return 
    }
  };

  return (
    <div name='imgUpload' id='imgUpload' className=''>
    <div className={`w-full bg-[#151515] inline-block  rounded-md items-center justify-center relative px-2 py-1`}>
        <label className={`relative cursor-pointer h-full p-1 text-xs text-[#fff] text-center w-full`} htmlFor={name}><p>Add Image</p></label>

      <input
        type="file"
        id={name}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />
    </div>
    {file ? <CropperPopup uploading={uploading} setUploading={setUploading} uploadedFile={file} onUpload={handleUpload} onClose={()=>setFile(null)}/> : null}
    </div>
  );
};

export default CarImageInfoUploader;
