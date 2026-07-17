import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminBtnPrimary, adminField, adminSelect } from '../../components/admin/adminClassNames';
import { api, getErrorMessage } from '../../services/api';
import { publicAssetUrl } from '../../utils/assetUrl';
import { groundImageList, groundLocationLabel, isMapUrl } from '../../utils/groundImages';

const MIN_GROUND_IMAGES = 3;

const fieldLabelClass = 'mb-1 block font-label text-[11px] font-semibold uppercase tracking-wider text-slate-500';

function FieldLabel({ children, required }) {
  return (
    <label className={fieldLabelClass}>
      {children}
      {required ? ' *' : ''}
    </label>
  );
}

function SectionHeading({ children, accent = 'cyan' }) {
  const color = accent === 'green' ? 'text-[#9bffce]' : 'text-admin-cyan';
  return (
    <h3 className={`font-headline text-xs font-bold uppercase tracking-[0.14em] ${color}`}>{children}</h3>
  );
}

export default function AdminGrounds() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('cricket');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerLocation, setOwnerLocation] = useState('');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState('60');
  const [lengthFeet, setLengthFeet] = useState('');
  const [areaSqFt, setAreaSqFt] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [imagePaths, setImagePaths] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [err, setErr] = useState('');

  const load = () =>
    api
      .get('/admin/grounds')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
  }, []);

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setPhotoUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await api.post('/uploads/image', fd);
        if (data.data?.path) uploaded.push(data.data.path);
      }
      if (uploaded.length) setImagePaths((prev) => [...prev, ...uploaded]);
    } catch (er) {
      alert(getErrorMessage(er));
    } finally {
      setPhotoUploading(false);
    }
  };

  const onPickGroundPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadFiles(files);
  };

  const removeImage = (index) => {
    setImagePaths((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setLocation('');
    setOwnerName('');
    setOwnerPhone('');
    setOwnerAddress('');
    setOwnerLocation('');
    setLengthFeet('');
    setAreaSqFt('');
    setPricePerHour('');
    setImagePaths([]);
  };

  const create = async (e) => {
    e.preventDefault();
    if (imagePaths.length < MIN_GROUND_IMAGES) {
      alert(`Please upload at least ${MIN_GROUND_IMAGES} ground photos (you have ${imagePaths.length}).`);
      return;
    }
    try {
      await api.post('/admin/grounds', {
        name,
        sportType,
        city,
        address,
        location,
        ownerName,
        ownerPhone,
        ownerAddress,
        ownerLocation,
        openTime,
        closeTime,
        slotDurationMinutes: Number(slotDurationMinutes) || 60,
        lengthFeet: Number(lengthFeet),
        areaSqFt: Number(areaSqFt),
        pricePerHour: Number(pricePerHour) || 0,
        imagePaths,
        isActive: true,
      });
      resetForm();
      load();
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ground management"
        subtitle="Register and monitor platform grounds you add (business-owner grounds stay in their panel)."
      />
      {err ? (
        <AdminCard accent="orange" className="p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}

      <AdminCard accent="cyan" className="p-6">
        <h2 className="mb-1 font-headline text-sm font-bold uppercase tracking-wide text-white">Add ground</h2>
        <p className="mb-6 font-label text-xs text-slate-500">
          Register a venue with owner details, opening hours, and at least {MIN_GROUND_IMAGES} photos.
        </p>
        <form onSubmit={create} className="space-y-8">
          <section className="space-y-4">
            <SectionHeading>1 · Ground details</SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Name</FieldLabel>
                <input
                  className={adminField}
                  placeholder="e.g. Arena Indoor Cricket"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Sport</FieldLabel>
                <select className={adminSelect} value={sportType} onChange={(e) => setSportType(e.target.value)}>
                  <option value="cricket">Cricket</option>
                  <option value="badminton">Badminton</option>
                </select>
              </div>
              <div>
                <FieldLabel required>City</FieldLabel>
                <input
                  className={adminField}
                  placeholder="e.g. Lahore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Ground address</FieldLabel>
                <input
                  className={adminField}
                  placeholder="Street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel required>Ground location</FieldLabel>
                <input
                  className={adminField}
                  placeholder="Area, landmark, or Google Maps link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>2 · Owner details</SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Owner name</FieldLabel>
                <input
                  className={adminField}
                  placeholder="Full name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Owner phone</FieldLabel>
                <input
                  className={adminField}
                  placeholder="03XX XXXXXXX"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Owner address</FieldLabel>
                <input
                  className={adminField}
                  placeholder="Owner postal address"
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Owner location</FieldLabel>
                <input
                  className={adminField}
                  placeholder="Area or map link"
                  value={ownerLocation}
                  onChange={(e) => setOwnerLocation(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading accent="green">3 · Hours & slots</SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Opens at</FieldLabel>
                <input
                  type="time"
                  className={adminField}
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Closes at</FieldLabel>
                <input
                  type="time"
                  className={adminField}
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Slot duration (minutes)</FieldLabel>
                <input
                  type="number"
                  min="15"
                  className={adminField}
                  placeholder="60"
                  value={slotDurationMinutes}
                  onChange={(e) => setSlotDurationMinutes(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading accent="green">4 · Dimensions</SectionHeading>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Ground length (feet)</FieldLabel>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={adminField}
                  placeholder="e.g. 120"
                  value={lengthFeet}
                  onChange={(e) => setLengthFeet(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Area (square feet)</FieldLabel>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={adminField}
                  placeholder="e.g. 8000"
                  value={areaSqFt}
                  onChange={(e) => setAreaSqFt(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel>Price per hour (PKR)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminField}
                  placeholder="e.g. 2500"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading>5 · Photos</SectionHeading>
            <FieldLabel required>Ground photos (minimum {MIN_GROUND_IMAGES})</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-md border border-dashed border-white/20 px-4 py-2 text-sm text-slate-400 transition-colors hover:border-admin-cyan hover:text-admin-cyan">
                {photoUploading ? 'Uploading…' : 'Choose photos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={photoUploading}
                  onChange={onPickGroundPhotos}
                />
              </label>
              <span
                className={`font-label text-xs ${imagePaths.length >= MIN_GROUND_IMAGES ? 'text-admin-cyan' : 'text-admin-orange'}`}
              >
                {imagePaths.length} / {MIN_GROUND_IMAGES}+ uploaded
              </span>
            </div>
            {imagePaths.length ? (
              <ul className="flex flex-wrap gap-2">
                {imagePaths.map((path, i) => (
                  <li key={`${path}-${i}`} className="group relative">
                    <img
                      src={publicAssetUrl(path)}
                      alt=""
                      className="h-20 w-28 rounded-md object-cover ring-1 ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white opacity-90 hover:opacity-100"
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <button type="submit" className={adminBtnPrimary} disabled={photoUploading}>
            Add ground
          </button>
        </form>
      </AdminCard>

      <div className="space-y-4">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wide text-white">Your grounds</h2>
        {!list.length ? (
          <AdminCard accent="none" className="border border-white/[0.06] p-12 text-center">
            <p className="font-label text-sm text-slate-500">No grounds yet.</p>
          </AdminCard>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((g) => {
              const images = groundImageList(g);
              const loc = groundLocationLabel(g);
              return (
                <li key={g._id}>
                  <AdminCard accent="cyan" className="overflow-hidden">
                    {images.length ? (
                      <div className="flex gap-1 border-b border-white/5 p-2">
                        {images.slice(0, 3).map((path, i) => (
                          <img
                            key={`${path}-${i}`}
                            src={publicAssetUrl(path)}
                            alt=""
                            className="h-16 flex-1 min-w-0 rounded-md object-cover"
                          />
                        ))}
                        {images.length > 3 ? (
                          <span className="flex h-16 w-10 shrink-0 items-center justify-center rounded-md bg-admin-surface-low text-[10px] text-slate-400">
                            +{images.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="h-16 border-b border-white/5 bg-admin-surface-low" />
                    )}
                    <div className="space-y-3 p-4 text-sm">
                      <div>
                        <h3 className="font-headline text-base font-bold uppercase tracking-wide text-white">
                          {g.name}
                        </h3>
                        <p className="mt-1 font-label text-[10px] uppercase tracking-wider text-admin-cyan">
                          {g.sportType}
                          {g.city ? ` · ${g.city}` : ''}
                        </p>
                      </div>
                      {loc ? (
                        <div>
                          <p className={fieldLabelClass}>Location</p>
                          <p className="text-xs text-slate-300">
                            {isMapUrl(loc) ? (
                              <a href={loc} target="_blank" rel="noreferrer" className="text-admin-cyan hover:underline">
                                Open map
                              </a>
                            ) : (
                              loc
                            )}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className={fieldLabelClass}>Owner</p>
                        <p className="text-xs text-slate-300">
                          {g.ownerName} · {g.ownerPhone}
                        </p>
                      </div>
                      {g.lengthFeet || g.areaSqFt ? (
                        <div>
                          <p className={fieldLabelClass}>Dimensions</p>
                          <p className="text-xs text-slate-300">
                            {g.lengthFeet ? `${g.lengthFeet} ft length` : null}
                            {g.lengthFeet && g.areaSqFt ? ' · ' : null}
                            {g.areaSqFt ? `${g.areaSqFt.toLocaleString()} sq ft` : null}
                            {images.length ? ` · ${images.length} photos` : null}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className={fieldLabelClass}>Hours</p>
                        <p className="text-xs text-slate-300">
                          {g.openTime || '—'} – {g.closeTime || '—'} · {g.slotDurationMinutes ?? 60} min slots
                        </p>
                      </div>
                    </div>
                  </AdminCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
