import React, { useState } from 'react';
import { toast } from 'react-toastify';
import CropperPopup from './CropperPopup';
import axios from 'axios';

// `folder` sorts the upload in the bucket (see storageFolders.js on the
// backend). Omitting it lands the object in `misc`.
const SingleImageHolder = ({ setImage ,name='uploader',setError,folder}) => {
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
        let urlRes = await axios.get(`/image/url`, { params: { folder } })

        const formData = new FormData();
        Object.entries(urlRes.data.fields).forEach(([field, value]) => {
            formData.append(field, value);
          });
          formData.append('acl', 'public-read');
        formData.append('file', file);
        let res = await axios.post(urlRes.data.url, formData)
        // let profileRes = await AuthAxios.put('/user/update-photo', {profilePhoto:`${urlRes.data.url}${urlRes.data.fields.key}`})
        setImage(`${urlRes.data.url}${urlRes.data.fields.key}`)
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
    <div name='imgUpload' id='imgUpload' className='w-full'>
    <div className={`w-full md:w-[180px] h-[100px]  rounded-md  flex items-center justify-center relative bg-gray-200`}>
        <label className={`absolute cursor-pointer h-full p-3 pt-10 text-xs text-[#959595] text-center w-full`} htmlFor={name}><p>Click to select image</p></label>

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

export default SingleImageHolder;
