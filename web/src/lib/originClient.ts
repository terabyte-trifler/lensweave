import axios from 'axios'

const base = process.env.NEXT_PUBLIC_ORIGIN_API_BASE!
const key  = process.env.ORIGIN_API_KEY!

type Creator = { wallet: string; shareBps: number }

const rest = axios.create({ baseURL: base, headers: { Authorization: `Bearer ${key}` } })

let sdk: any = null
try {
  // Prefer SDK if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@campnetwork/origin')
  sdk = mod?.default ?? mod
} catch (_) {
  sdk = null
}

export async function originRegisterImage(args: {
  title: string
  mediaCid: string
  mediaUri: string
  creators?: Creator[]
}) {
  if (sdk?.Onboard?.register) {
    return await sdk.Onboard.register({
      type: 'IMAGE',
      title: args.title,
      media: { cid: args.mediaCid, uri: args.mediaUri, storage: 'ipfs' },
      creators: args.creators ?? [],
      apiKey: key,
    })
  }
  const { data } = await rest.post('/onboard/register', {
    type: 'IMAGE',
    title: args.title,
    media: { cid: args.mediaCid, uri: args.mediaUri, storage: 'ipfs' },
    creators: args.creators ?? [],
  })
  return data
}

export async function originGrantPermission(args: {
  contentId: string
  policy: Record<string, any>
}) {
  if (sdk?.Permission?.grant) {
    return await sdk.Permission.grant({ ...args, apiKey: key })
  }
  const { data } = await rest.post('/permission/grant', args)
  return data
}

export async function originCreateRemix(args: {
  parentId: string
  title: string
  mediaCid: string
  mediaUri: string
  creators: Creator[]
}) {
  if (sdk?.Remix?.create) {
    return await sdk.Remix.create({
      type: 'IMAGE',
      title: args.title,
      parentId: args.parentId,
      media: { cid: args.mediaCid, uri: args.mediaUri, storage: 'ipfs' },
      creators: args.creators,
      apiKey: key,
    })
  }
  const { data } = await rest.post('/remix/create', {
    type: 'IMAGE',
    title: args.title,
    parentId: args.parentId,
    media: { cid: args.mediaCid, uri: args.mediaUri, storage: 'ipfs' },
    creators: args.creators,
  })
  return data
}

export async function originSetMonetization(args: {
  contentId: string
  splits: Creator[] // { wallet, shareBps }
}) {
  if (sdk?.Monetize?.splits) {
    return await sdk.Monetize.splits({ ...args, apiKey: key })
  }
  const { data } = await rest.post('/monetize/splits', args)
  return data
}
