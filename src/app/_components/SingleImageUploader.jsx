import React, { useState, useRef } from 'react';
import CloseIcon from '../images/close.svg'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { photoUrl } from '@/app/_helpers/media';

const SingleImageUploader = ({image,setImage}) => {
  const [coverImage, setCoverImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (files) => {

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (e) => {

        setImage(e.target.result);
      };

      reader.readAsDataURL(file);
    }
  };


  const handleClick = () => {
    // Trigger the hidden file input
    fileInputRef.current.click();
  };

  const handleFileInputChange = (event) => {
    const files = event.target.files;
    handleFileUpload(files);
  };



  return <div className='  bg-[#f3f3f3] min-h-[140px] w-[240px] rounded-md p-3'>
          <div
            style={{
              display: 'flex',
              gap:'8px',
              overflowX: 'auto', // Enable horizontal scrolling

            }}
          >
            {
              image ? <div className='flex items-center justify-center w-full h-[120px] '
              
            > 
              <p className='text-xs font-medium tracking-tighter text-[#757575] w-full text-center items-center'>Click here or drop file to upload</p>
            </div> :                   <div
                  className='relative min-w-[150px] rounded-md overflow-hidden'
                  >
                    <div>

                    <img className='w-[150px] h-[100px]'
                      src={photoUrl(image)}
                      alt={`cover Image`}
                      />
                      </div>

                    {/* <div className=''>

                      <button type='button' className='bg-[rgba(255,255,255,0.85)] absolute right-1 top-1 rounded-full hover:bg-[rgba(255,255,255,0.75)] px-1 h-6 w-6' onClick={() => handleRemoveImage(index)}><img src={CloseIcon} className='h-4 w-4'/></button>
                    </div> */}
                  </div>
            }
      </div>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      </div>
};

export default SingleImageUploader;
