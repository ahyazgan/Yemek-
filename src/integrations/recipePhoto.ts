import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { MAX_PHOTO_LENGTH, photoSchema, type RecipePhoto } from '../domain/recipeMedia';

export async function selectRecipePhoto(): Promise<RecipePhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: false,
    quality: 1,
    exif: false,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (
    !asset ||
    asset.type === 'video' ||
    (asset.fileSize ?? 0) > 15000000 ||
    asset.width * asset.height > 40000000 ||
    asset.width <= 0 ||
    asset.height <= 0
  )
    throw new Error('15 MB ve 40 megapikselin altında bir fotoğraf seç.');
  // Decode/re-encode a small raster, keeping EXIF and file paths out of snapshots.
  for (const size of [720, 480, 320]) {
    const context = ImageManipulator.manipulate(asset.uri);
    const ratio = Math.min(1, size / Math.max(asset.width, asset.height));
    context.resize({
      width: Math.max(1, Math.round(asset.width * ratio)),
      height: Math.max(1, Math.round(asset.height * ratio)),
    });
    let image: ImageRef | undefined;
    try {
      image = await context.renderAsync();
      const saved = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.72,
        base64: true,
      });
      const dataUri = 'data:image/jpeg;base64,' + (saved.base64 ?? '');
      if (dataUri.length <= MAX_PHOTO_LENGTH)
        return photoSchema.parse({
          dataUri,
          width: saved.width,
          height: saved.height,
          caption: '',
        });
    } finally {
      image?.release();
      context.release();
    }
  }
  throw new Error('Fotoğraf küçültülemedi. Daha küçük bir görsel seç.');
}
