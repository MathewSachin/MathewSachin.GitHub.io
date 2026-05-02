<script lang="ts">
import { onDestroy, onMount } from 'svelte';

let lightbox: HTMLDialogElement;
let lightboxImg: HTMLImageElement;

function closeLightbox() {
  lightbox?.close();
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Element | null;
  const clicked = target?.closest('.page-content img') as HTMLImageElement | null;
  if (!clicked) return;

  lightboxImg.src = clicked.src || '';
  lightboxImg.alt = clicked.alt || '';
  lightbox.showModal();
}

function onDialogClick(e: MouseEvent) {
  if (e.target === lightbox) {
    lightbox.close();
  }
}

onMount(() => {
  document.addEventListener('click', onDocumentClick);
  lightbox.addEventListener('click', onDialogClick);
});

onDestroy(() => {
  document.removeEventListener('click', onDocumentClick);
  lightbox?.removeEventListener('click', onDialogClick);
});
</script>

<dialog id="img-lightbox" aria-label="Image lightbox" data-proofer-ignore bind:this={lightbox}>
  <div class="lightbox-content">
    <button type="button" class="lightbox-close" aria-label="Close" on:click={closeLightbox}>&times;</button>
    <img src="" alt="Expanded image" bind:this={lightboxImg} />
  </div>
</dialog>

<style>
#img-lightbox {
  max-width: 90vw;
  background: #343a40;
  border: none;
  border-radius: 4px;
  padding: 0;
}

#img-lightbox::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.lightbox-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  position: relative;
}

#img-lightbox img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border: none;
  border-radius: 4px;
  margin: 0;
  cursor: default;
}

#img-lightbox img:hover {
  transform: none;
  opacity: 1;
  box-shadow: none;
  border-color: transparent;
}

#img-lightbox .lightbox-close {
  filter: invert(1);
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  z-index: 10;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: white;
  line-height: 1;
  padding: 0;
}
</style>
