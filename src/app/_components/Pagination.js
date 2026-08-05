import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LIMIT } from '../_helpers/constants';

const Pagination = ({ offset, setOffset, count }) => {
  return (
    <div className='flex w-auto self-stretch items-stretch h-full text-center max-w-[200px] border-r border-r-gray-200'>
      <div
          className='px-3 py-2 hover:bg-[#f6f6f6] h-full cursor-pointer flex items-center flex-1 justify-center'
        onClick={() => {
          if (offset > 0) {
            setOffset(offset - LIMIT);
          }
        }}
      >
        <ChevronLeft className='w-[20px] h-[20px] text-black' />
      </div>
      <p className='text-xs whitespace-nowrap w-[80px] justify-center h-full flex items-center'>{offset + 1}-{Math.min(offset + LIMIT, count)} of {count}</p>
      <div
        className='px-3 py-2 hover:bg-[#f6f6f6] h-full cursor-pointer flex items-center flex-1 justify-center'
        onClick={() => {
          if (offset + LIMIT < count) {
            setOffset(offset + LIMIT);
          }
        }}
      >
        <ChevronRight className='w-[20px] h-[20px] text-black' />
      </div>
    </div>
  );
};

export default Pagination;
