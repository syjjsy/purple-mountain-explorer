import { ArrowUpRight, Clock3, MapPin, Mountain, Trees } from 'lucide-react'
import { photoLibrary, type Photo } from './data'
import { asset } from './geo'

export function Brand() {
  return <a className="brand" href="#top" aria-label="紫金山 · 掌上山野首页">
    <span className="brand-mark"><Mountain size={23} strokeWidth={1.55}/></span>
    <span><strong>紫金山</strong><small>PURPLE MOUNTAIN</small></span>
  </a>
}
export function PhotoFrame({ photo, alt, sizes='(max-width: 700px) 75vw, 430px', eager=false }: {
  photo?: Photo; alt: string; sizes?: string; eager?: boolean
}) {
  if (!photo) return <div className="photo-placeholder" aria-hidden="true"><Trees size={39} strokeWidth={1}/></div>
  return <img alt={alt} src={asset(`images/${photo.id}.webp`)}
    srcSet={`${asset(`images/${photo.id}-small.webp`)} ${photo.smallWidth??510}w, ${asset(`images/${photo.id}.webp`)} ${photo.width??960}w`}
    sizes={sizes} loading={eager?'eager':'lazy'} decoding="async"/>
}
export function getPhoto(id:string) { return photoLibrary.find(photo => photo.id===id) }
export function Credit({ photo }: { photo:Photo }) {
  return <span className="credit"><a href={photo.source} target="_blank" rel="noreferrer">{photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · 已缩放</span>
}
export function SectionHeading({ english,title,children }: { english:string; title:string; children?:React.ReactNode }) {
  return <div className="section-heading">
    <div><span className="section-kicker">{english}</span><h2>{title}</h2></div>
    {children}
  </div>
}
export function External({ href, children }: { href:string; children:React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-link">{children}<ArrowUpRight size={15}/></a>
}
export function Visit({ minutes }: { minutes:number }) {
  return <span className="icon-text"><Clock3 size={14}/>约 {minutes} 分钟</span>
}
export function SpotChip({ onClick, children }: { onClick: () => void; children:React.ReactNode }) {
  return <button type="button" className="spot-chip" onClick={onClick}><MapPin size={13}/>{children}</button>
}
