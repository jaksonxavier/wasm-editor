use std::alloc::{alloc, dealloc, Layout};
use std::mem;

#[no_mangle]
pub extern "C" fn allocate(length: usize) -> *mut u8 {
    let align = mem::align_of::<usize>();
    if let Ok(layout) = Layout::from_size_align(length, align) {
        unsafe {
            if layout.size() > 0 {
                let ptr = alloc(layout);
                if !ptr.is_null() {
                    return ptr;
                }
            }
        }
    }
    std::process::abort(); // Allocation failed
}

#[no_mangle]
pub extern "C" fn deallocate(ptr: *mut u8, length: usize) {
    unsafe {
        if !ptr.is_null() {
            let align = mem::align_of::<usize>();
            let layout = Layout::from_size_align(length, align).unwrap();
            dealloc(ptr, layout);
        }
    }
}

#[no_mangle]
pub extern "C" fn grayscaleFilter(ptr: *mut u8, length: usize) {
    let pixels = unsafe { std::slice::from_raw_parts_mut(ptr, length) };
    for chunk in pixels.chunks_exact_mut(4) {
        let avg = (chunk[0] / 3) + (chunk[1] / 3) + (chunk[2] / 3);
        chunk[0] = avg;
        chunk[1] = avg;
        chunk[2] = avg;
    }
}
