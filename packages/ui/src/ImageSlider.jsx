'use client'
import { useState } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Image from 'next/image';
import { photoUrl } from '@cocarr/shared-utils';

const ImageSlider = ({ images, tag=false, tagField='' }) => {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    // Transform images array for lightbox
    const slides = images?.map(image => ({
        src: photoUrl(image.url),
        alt: 'Vehicle Image'
    }));

    const handleImageClick = (clickedIndex) => {
        setIndex(clickedIndex);
        setOpen(true);
    };

    return (
        <>
            <Splide
                options={{
                    type: 'slide',
                    autoWidth: true,
                    gap: '0.5rem',
                    pagination: false,
                    arrows: true
                }}
                className="w-full"
            >
                {images?.map((image, idx) => (
                    <SplideSlide key={idx}>
                        <div 
                            className="relative cursor-pointer" 
                            onClick={() => handleImageClick(idx)}
                        >
                            <img
                                src={photoUrl(image.url)}
                                alt={`Vehicle image ${idx + 1}`}
                                className="object-cover w-[180px] h-[100px] rounded-lg hover:opacity-90 transition-opacity"
                                width={180}
                                height={100}
                            />
                            {image.isCover && (
                                <span className="absolute top-2 left-2 bg-[#EBC030] text-[#000] text-xs px-2 py-1 rounded tracking-tight font-semibold">
                                    Cover Image
                                </span>
                            )}
                            {tag && (
                                <span className="absolute top-2 left-2 bg-[#EBC030] text-[#000] text-xs px-2 py-1 rounded tracking-tight font-semibold">
                                    {image[tagField]}
                                </span>
                            )}
                        </div>
                    </SplideSlide>
                ))}
            </Splide>

            <Lightbox
                open={open}
                close={() => setOpen(false)}
                index={index}
                slides={slides}
            />
        </>
    );
};

export default ImageSlider;