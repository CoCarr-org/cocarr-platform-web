import React, { useState, useCallback } from 'react';
import { useUploady } from '@rpldy/uploady';
import { UploadDropZone, useDropZone } from '@rpldy/uploady-ui';
import { useUploadOptions } from '@rpldy/shared-ui';
import { toast } from 'react-toastify';
import { Crop } from '@rpldy/uploady-crop';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { photoUrl } from '@/app/_helpers/media';

const CropUpload = ({ setImage, image, label = '', name, type = 'normal', setError }) => {
  const [uploading, setUploading] = useState(false);
  const [crop, setCrop] = useState({ aspect: 1 / 1 });
  const [croppedImages, setCroppedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const { getRootProps, getInputProps } = useDropZone({
    onDrop: useCallback((acceptedFiles) => {
      setSelectedFiles(acceptedFiles);
    }, [])
  });

  const uploady = useUploady();
  const { uploader } = useUploadOptions(uploady);

  const handleCropComplete = async (croppedArea, croppedAreaPixels, fileIndex) => {
    try {
      const croppedImg = await getCroppedImg(selectedFiles[fileIndex], croppedAreaPixels);
      setCroppedImages((prevState) => {
        const updatedImages = [...prevState];
        updatedImages[fileIndex] = croppedImg;
        return updatedImages;
      });
    } catch (error) {
      toast.error('Error cropping image');
      console.error(error);
      setError(error?.response?.data?.message ? error.response.data.message : 'Error cropping image');
    }
  };

  const getCroppedImg = (image, pixelCrop) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleImageUpload = async () => {
    try {
      setUploading(true);
      const uploadedFiles = await uploader(selectedFiles);
      const uploadedImgs = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          let formData = new FormData();
          formData.append('file', file);
          formData.append('acl', 'public-read');

          let response = await fetch('/image/url', {
            method: 'GET', // adjust accordingly
            headers: {
              'Content-Type': 'application/json',
              // add any other headers if needed
            },
          });

          let urlRes = await response.json();

          formData.append('key', urlRes.fields.key);
          Object.entries(urlRes.fields).forEach(([field, value]) => {
            formData.append(field, value);
          });

          let res = await fetch(urlRes.url, {
            method: 'POST',
            body: formData,
          });
          return `${urlRes.url}${urlRes.fields.key}`;
        })
      );
      setImage(uploadedImgs);
      setUploading(false);
    } catch (error) {
      toast.error('Error uploading image');
      console.error(error);
      setError(error?.response?.data?.message ? error.response.data.message : 'Error uploading image');
      setUploading(false);
    }
  };

  return (
    <div className='w-full'>
      {type !== 'profile' ? (
        <label className={`text-[#a3a3a3] font-normal text-xs transition-all tracking-normal mb-2 inline-block`}>
          {label}
        </label>
      ) : null}
      <div {...getRootProps()} className={`${type === 'profile' ? 'w-[120px]' : 'w-full md:w-[180px]'} h-${
        type === 'profile' ? '[120px]' : '[100px]'
      }  rounded-${type === 'profile' ? 'full' : 'md'}  flex items-center justify-center relative bg-gray-200`}>
        <input {...getInputProps()} accept='image/*' />
        <UploadDropZone />
        {selectedFiles.length > 0 ? (
          <Crop
            image={selectedFiles[0]}
            crop={crop}
            onComplete={(croppedArea, croppedAreaPixels) => handleCropComplete(croppedArea, croppedAreaPixels, 0)}
          >
            <ReactCrop
              src={URL.createObjectURL(selectedFiles[0])}
              crop={crop}
              onChange={(newCrop) => setCrop(newCrop)}
              onComplete={(croppedArea, croppedAreaPixels) => handleCropComplete(croppedArea, croppedAreaPixels, 0)}
            />
          </Crop>
        ) : image ? (
          <>
            <label
              className={`absolute cursor-pointer bg-[#fff] hover:bg-[#f3f3f3] h-[24px] w-[24px] right-2 bottom-2 rounded-full text-xs text-[#959595] text-center`}
              htmlFor={name}
            >
              <img src={''} height={24} width={24} className='p-2' />
            </label>
            <img
              src={photoUrl(image)}
              className='cursor-pointer rounded-sm'
              alt='Selected'
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </>
        ) : type !== 'profile' ? (
          <label
            className={`absolute cursor-pointer h-full p-3 pt-10 text-xs text-[#959595] text-center w-full`}
            htmlFor={name}
          >
            <p>Click to select image</p>
          </label>
        ) : (
          <label
            className={`absolute cursor-pointer h-full p-3 pt-5 text-xs text-[#959595] text-center w-full`}
            htmlFor={name}
          >
            <p>Profile image</p>
          </label>
        )}
      </div>
      <button
        className='bg-blue-500 text-white rounded-md py-2 px-4 mt-2'
        onClick={handleImageUpload}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  );
};

export default CropUpload;
