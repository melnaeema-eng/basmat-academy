import {useEffect} from "react";
export default function PageMeta({title,description}){
 useEffect(()=>{const old=document.title;if(title)document.title=`${title} | Basmat Alnawabigh Academy`;let m=document.querySelector('meta[name="description"]');if(!m){m=document.createElement("meta");m.name="description";document.head.appendChild(m)}const prev=m.content;if(description)m.content=description;return()=>{document.title=old;m.content=prev}},[title,description]);return null
}
