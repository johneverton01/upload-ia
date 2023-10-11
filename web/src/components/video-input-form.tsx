import { api } from "@/lib/axios";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from '@ffmpeg/util';
import { FileVideo, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

type Status = 'waiting' | 'converting' | 'uploading' | 'generation' | 'success'

const statusMessages = {
  converting: 'Convertendo...',
  generation: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
}

interface VideoInputFormProps {
  onVideosUploaded: (videoId: string) => void
}

export function VideoInputForm({ onVideosUploaded }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget
    if (!files) return

    const selectedFile = files[0]
    setVideoFile(selectedFile)  
  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert Started')

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

     // ffmpeg.on('log', log => console.log(log))

    ffmpeg.on('progress', progress => {
      console.log('Convert progress: ' + Math.round(progress.progress * 100))
  })

  await ffmpeg.exec([
    '-i',
    'input.mp4',
    '-map',
    '0:a',
    '-b:a',
    '20k',
    '-acodec',
    'libmp3lame',
    'output.mp3'
  ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'output.mp3', { 
      type: 'audio/mpeg',
    })

    console.log('Convert Finished')

    return audioFile

  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = promptInputRef.current?.value
    

    if (!videoFile) return

    setStatus('converting')
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')
    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generation')
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    })

    setStatus('success')
    onVideosUploaded(videoId)

  }

  const previewURL = useMemo(() => {
    if(!videoFile) return null

    return URL.createObjectURL(videoFile)
    
  }, [videoFile])

  return (
    <form className="space-y-6" onSubmit={handleUploadVideo}>
      <label
        htmlFor="video"
        className="relative border flex flex-col rounded-md aspect-video cursor-pointer border-dashed text-sm gap-2 items-center justify-center text-muted-foreground hover:bg-primary/10 hover:transition-colors duration-500"
      >
        {videoFile ? (
          <video src={previewURL!} controls={false}  className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            selecione um vídeo
          </>
        )}
      </label>
      <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected}/>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== 'waiting'} 
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
        />
      </div>
      <Button 
        data-success={status === 'success'}
        disabled={status !== 'waiting'}  
        type="submit" 
        className="w-full text-slate-100 data-[success=true]:bg-emerald-400 data-[success=true]:text-slate-900"
      >
        { status === 'waiting' ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : statusMessages[status] }
      </Button>
    </form>
  );
}
