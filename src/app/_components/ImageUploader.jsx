import React, { useState } from 'react';
import { IoCloseSharp } from 'react-icons/io5'
import { useDropzone } from 'react-dropzone';
// import AuthAxios from '../helpers/axios';
// import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import axios from 'axios';

const ImageUploader = ({images,setImages}) => {
  // const [images, setImages] = useState([]);
  const [uploaded, setUploaded] = useState(false);
  // const innerRef = useRef()

  const onDrop = async (acceptedFiles) => {
    const newImages = [...images];

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        // Make an HTTP post request to your image upload endpoint
        const response = await axios.post('/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            updateImageProgress(newImages.length, progress);
          },
        });

        // Assuming your API responds with the uploaded image details
        const uploadedImage = response.data;

        newImages.push({
          id: new Date()+1,
          src: `${process.env.REACT_APP_UPLOAD_URL}/${uploadedImage.imageName}`,
          isCover: false,
          progress: 100, // Set progress to 100 after successful upload
        });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    setImages(newImages);
    setUploaded(true);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    onDrop: uploaded ? undefined : onDrop, // Disable drop if images are uploaded
  });

  const updateImageProgress = (index, progress) => {
    // const updatedImages = [...images];
    // updatedImages[index].progress = progress;
    // setImages(updatedImages);
  };

  const handleCoverImageChange = (imageId) => {
    const updatedImages = images.map((image) => ({
      ...image,
      isCover: image.id === imageId,
    }));

    setImages(updatedImages);
  };

  const handleRemoveImage = (imageId) => {
    const updatedImages = images.filter((image) => image.id !== imageId);
    setImages(updatedImages);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const reorderedImages = Array.from(images);
    const [removed] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, removed);

    setImages(reorderedImages);
  };

  return (
    <div>
      {images.length <= 0 ? <div
        {...getRootProps()}
        className='bg-[#f3f3f3] w-[160px] h-[100px] flex items-center justify-center rounded-md'
      >
        <input {...getInputProps()} />
        <p className='text-xs font-medium tracking-tighter text-[#757575] text-center m-4 my-auto'>Click or Drop files to upload</p>
      </div> : null}
      {/* <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable direction="horizontal" droppableId="images">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto', // Enable horizontal scrolling
              }}
            >
        {images.map((image, index) => <ImageItem onDragEnd={handleDragEnd} handleCoverImageChange={handleCoverImageChange} handleRemoveImage={handleRemoveImage} image={image} key={index} index={index}/>)}
      </div>
          )}
        </Droppable>
      </DragDropContext> */}
    </div>
  );
};

export default ImageUploader;



// function ImageItem({image,index,handleCoverImageChange,handleRemoveImage,onDragEnd}){
//     return <Draggable key={image.id} draggableId={String(image.id)} index={index}>
//                   {(provided) => (
//                     <div
//                       className="relative min-w-[150px] rounded-md overflow-hidden"
//                       ref={provided.innerRef}
//                       {...provided.draggableProps}
//                       {...provided.dragHandleProps}
//                     >
//             <img className='w-[100%] max-h-[100px]'
//               src={image.src}
//               alt={`Image ${image.id}`}
//             />

//             {index === 0 ? <div className='absolute top-1 left-1 z-10'>
//               <p className='bg-white rounded-sm inline-block px-2 py-1 text-xs leading-none font-medium tracking-tighter'>Cover Image</p>
//             </div> : null}

//             <div>
//               <div className='w-[95%] bg-[rgba(255,255,255,0.25)] rounded-lg h-[6px] absolute bottom-2 left-1 z-10'>
//                 <div className='w-full relative flex'>
//                   <div className={`w-full bg-black rounded-lg h-[6px] absolute left-[${image.progress ? 10 : 20}%]`}>

//                   </div>
//                 </div>
//               </div>
//               {/* <progress className='' value={image.progress} max={100} /> */}
//               <div className=''>

//                       <button type='button' className='bg-[rgba(255,255,255,0.85)] absolute right-1 top-1 rounded-full hover:bg-[rgba(255,255,255,0.75)] px-1 h-6 w-6' onClick={() => handleRemoveImage(image.id)}><IoCloseSharp width={16} height={16}/></button>
//                     </div>
//                     </div>
//                     </div>

//             )}
//           </Draggable>
// } 