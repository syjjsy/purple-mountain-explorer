import coordinates from './poi-geometry.json'
import routeGeometry from './route-geometry.json'
import photos from './photos.json'

export type Coordinate = [number, number]
export const categories = ['历史建筑', '自然景观', '山顶观景', '科学文化', '休闲游览'] as const
export type Category = typeof categories[number]
export const verifiedDate = '2026-11-21'
export const official = 'https://zschina.nanjing.gov.cn'
export const guide = official + '/zszx/dtxx/202506/t20250626_5593899.html'
export const greenway = official + '/fjms/fwzn/ldxl/202303/t20230310_3859261.html'
const attraction = (id: string) => official + '/fjms/jqjd/' + id + '/'
const tickets = official + '/fjms/fwzn/mpxx/'

export interface Photo {
  id: string
  title: string
  author: string
  license: string
  licenseUrl: string
  source: string
  width?: number
  smallWidth?: number
}
const library: Photo[] = photos
export const photoLibrary = library
export interface ScenicSpot {
  id: string
  name: string
  shortName?: string
  englishName: string
  category: Category
  longitude: number
  latitude: number
  elevation: number
  description: string
  highlights: string[]
  images: Photo[]
  estimatedVisitMinutes: number
  ticketInfo: string
  officialUrl: string
  entranceCoordinates?: Coordinate
  entranceName?: string
  entranceSource?: string
  navigationCoordinates?: Coordinate
  navigationName?: string
  navigationSource?: string
  coordinateRole: string
  coordinatesSource: string
  lastVerified: string
  approach: string
  featured?: boolean
}
type SpotKey = keyof typeof coordinates
const descriptions: Record<SpotKey, Omit<ScenicSpot,'id'|'longitude'|'latitude'|'elevation'|'images'|'coordinateRole'|'coordinatesSource'|'lastVerified'>> = {
  sun: {
    name: '中山陵', englishName: 'Sun Yat-sen Mausoleum', category: '历史建筑', featured: true,
    description: '循着博爱坊后的石阶上行，青蓝琉璃瓦的祭堂坐落在紫金山南坡。回望时，开阔的陵园轴线顺山势一路向下。',
    highlights: ['博爱坊与陵园轴线', '石阶与祭堂', '南坡林海'], estimatedVisitMinutes: 75,
    ticketInfo: '陵寝免费预约。官方常规开放 08:30–17:00，周一维护，节假日及纪念日例外。', officialUrl: attraction('zsljq'),
    approach: '从中山陵南站或游客中心步行至博爱坊，按预约指引前往检录口。',
  },
  ming: {
    name: '明孝陵', englishName: 'Ming Xiaoling Mausoleum', category: '历史建筑', featured: true,
    description: '沿着弯折的神道穿过石兽与古树，再往北便是红墙掩映的方城明楼。这里是明朝开国皇帝朱元璋和马皇后的合葬陵寝。',
    highlights: ['石象路神道', '方城明楼与宝顶', '明清皇家陵寝世界遗产'], estimatedVisitMinutes: 100,
    ticketInfo: '官方普通票 ¥70。2–11 月售票 06:30–18:30，12–1 月 07:00–17:30。', officialUrl: attraction('mxljq'),
    approach: '从植物园路可到 1 号门，前往石象路也可由陵园路附近的 5 号门入园。',
  },
  linggu: {
    name: '灵谷寺及灵谷景区', shortName: '灵谷景区', englishName: 'Linggu Scenic Area', category: '历史建筑', featured: true,
    description: '钟山东南麓的林间，红山门、无梁殿与灵谷塔沿路展开。寺院藏在林荫里，秋季的桂香是这里的季节记忆。',
    highlights: ['红山门', '无梁殿', '灵谷寺与灵谷塔'], estimatedVisitMinutes: 90,
    ticketInfo: '官方普通票 ¥35。2–11 月售票 06:30–18:30，12–1 月 07:00–17:30。', officialUrl: attraction('lgjq'),
    approach: '由灵谷寺路前往景区红山门，从南向北游览。',
  },
  palace: {
    name: '美龄宫', englishName: 'Meiling Palace', category: '历史建筑', featured: true,
    description: '小红山上的近代官邸藏在梧桐之间，绿色琉璃屋面与明黄墙身下，是可以逐层参观的民国生活空间。',
    highlights: ['绿色琉璃屋面', '民国官邸陈设', '陵园路梧桐景观'], estimatedVisitMinutes: 45,
    ticketInfo: '官方普通票 ¥30。常规开放 07:30–18:00，17:30 停止入园。', officialUrl: attraction('mlg'),
    approach: '前往陵园路美龄宫访客入口，按景区标识上行。地图标记为官邸建筑。',
  },
  observatory: {
    name: '紫金山天文台博物馆', shortName: '紫金山天文台', englishName: 'Purple Mountain Observatory', category: '科学文化', featured: true,
    description: '西峰的历史台址内，观测圆顶、古天文仪器与天堡城遗迹记录了南京的近代天文史。',
    highlights: ['古天文仪器', '观测圆顶', '天堡城遗迹'], estimatedVisitMinutes: 60,
    ticketInfo: '博物馆设有独立票务，开放安排以官方旅游攻略为准。', officialUrl: official + '/fjms/jqjd/zjssd/zyjd/202508/t20250804_5621364.html',
    approach: '索道天文台站下车后按指示步行约 200 米至天文台东门。地图标记为历史台址范围。',
  },
  ridge: {
    name: '头陀岭', englishName: 'Toutuo Ridge', category: '山顶观景', featured: true,
    description: '头陀岭海拔约 448 米，位于主峰西侧。晴朗时可向西眺望玄武湖和南京城区，也能沿山脊辨认紫金山的走向。',
    highlights: ['山顶观景平台', '山脊林海', '城市与玄武湖远眺'], estimatedVisitMinutes: 30,
    ticketInfo: '官方登山道免费，索道单独购票。', officialUrl: official + '/zszx/dtxx/202601/t20260116_5770265.html',
    approach: '沿开放登山道前往山顶，或自地堡城站乘索道。图上标记为山峰。',
  },
  music: {
    name: '音乐台', englishName: 'Open-Air Music Stage', category: '休闲游览', featured: true,
    description: '中山陵广场东南的露天剧场依坡而建。半圆草坪与弧形照壁围出一处安静的林间空间。',
    highlights: ['扇形观众席', '照壁与舞台', '林间草坪'], estimatedVisitMinutes: 30,
    ticketInfo: '官方普通票 ¥10。2–11 月售票 06:30–18:30，12–1 月 07:00–17:30。', officialUrl: attraction('ylt'),
    approach: '从中山陵广场沿音乐台方向指示下行，具体检票口看现场标识。',
  },
  spirit: {
    name: '石象路', englishName: 'Stone Elephant Road', category: '历史建筑',
    description: '明孝陵神道的一段。成对的石狮、石象和石骆驼立在林荫两侧，秋日树色层次尤为鲜明。',
    highlights: ['神道石刻', '秋日彩林'], estimatedVisitMinutes: 30,
    ticketInfo: '位于明孝陵景区内。', officialUrl: attraction('mxljq'),
    approach: '可从明孝陵 5 号门入园，沿景区导览前往神道。',
  },
  plum: {
    name: '梅花山', englishName: 'Plum Blossom Hill', category: '自然景观',
    description: '明孝陵景区内一处缓坡赏梅地。早春花开时，可在神道与花林之间安排一段慢行。',
    highlights: ['春日赏梅', '明孝陵花林'], estimatedVisitMinutes: 45, ticketInfo: '位于明孝陵景区内。',
    officialUrl: attraction('mxljq'), approach: '由明孝陵入口入园后按梅花山指示牌前往。导航入口为景区 5 号门。',
  },
  garden: {
    name: '中山植物园', englishName: 'Nanjing Botanical Garden', category: '自然景观',
    description: '紫金山南麓的植物园由南园和北园构成。两园隔着植物园路，可以按季节挑选花园、树木和温室游览。',
    highlights: ['南北园的植物展区', '季节花卉', '树木与温室'], estimatedVisitMinutes: 90,
    ticketInfo: '分园开放与票务见园方公告。', officialUrl: 'https://www.cnbg.net/',
    approach: '公交到中山植物园站后按园方标识选择南园或北园入口。图上标记为北园范围。',
  },
  cable: {
    name: '紫金山索道', englishName: 'Purple Mountain Cableway', category: '休闲游览',
    description: '索道从西侧地堡城站上山，经天文台站至头陀岭站。车厢沿西坡上升时，可看见山林与城墙相接。',
    highlights: ['地堡城站', '天文台站', '头陀岭站'], estimatedVisitMinutes: 30,
    ticketInfo: '官方常规售票为周一 09:30–17:00，周二至周五 09:00–17:00，周末 09:00–17:30。检修和天气可影响运行。', officialUrl: official + '/zszx/zsdt/202604/t20260421_5827107.html',
    approach: '从太平门路前往索道地堡城站，按现场标识购票乘车。',
  },
  pipa: {
    name: '琵琶湖', englishName: 'Pipa Lake', category: '自然景观',
    description: '明城墙与紫金山之间的山脚小湖，也是环紫金山绿道官方介绍中的起点。',
    highlights: ['山脚湖面', '明城墙', '环山绿道'], estimatedVisitMinutes: 35,
    ticketInfo: '湖边游览以公园公告为准。', officialUrl: greenway,
    approach: '从太平门路沿公开步道前往琵琶湖公园。图上标记位于湖面。',
  },
  zixia: {
    name: '紫霞湖', englishName: 'Zixia Lake', category: '自然景观',
    description: '明孝陵宝顶东北的林间水库。可以从开放的环湖路段观赏山林倒影。',
    highlights: ['林间水库', '环湖步道景色'], estimatedVisitMinutes: 35,
    ticketInfo: '位于明孝陵景区内。', officialUrl: attraction('mxljq'),
    approach: '从明孝陵景区内按紫霞湖指示前往。图上标记位于湖面，沿岸以现场开放范围为准。',
  },
  avenue: {
    name: '陵园路', englishName: 'Lingyuan Avenue', category: '休闲游览',
    description: '梧桐高枝跨过道路，在山脚围合出长长的绿荫。梅花谷路至四方城东路段实行步行道管理。',
    highlights: ['梧桐树冠', '公开步行道', '秋日叶色'], estimatedVisitMinutes: 25,
    ticketInfo: '道路通行以管理局公告为准。', officialUrl: official + '/zszx/gsgg/202509/t20250925_5657084.html',
    approach: '由苜蓿园地铁站沿现场指引前往步行段。道路标记位于景观路段中部。',
  },
  tower: {
    name: '灵谷塔', englishName: 'Linggu Pagoda', category: '历史建筑',
    description: '灵谷景区北部的纪念塔从林间拔地而起，塔身的层层檐角是紫金山东南麓容易辨认的地标。',
    highlights: ['纪念塔', '林间轴线', '塔前广场'], estimatedVisitMinutes: 25,
    ticketInfo: '位于灵谷景区内，登塔开放以现场公告为准。', officialUrl: attraction('lgjq'),
    approach: '由灵谷景区红山门入园，向北经无梁殿方向抵达。',
  },
}
export const spots: ScenicSpot[] = (Object.keys(descriptions) as SpotKey[]).map(id => {
  const point = coordinates[id]
  const entry = 'entranceCoordinates' in point ? {
    entranceCoordinates: point.entranceCoordinates as Coordinate,
    entranceName: point.entranceName,
    entranceSource: point.entranceSource,
  } : {}
  const navigation = 'navigationCoordinates' in point ? {
    navigationCoordinates: point.navigationCoordinates as Coordinate,
    navigationName: point.navigationName,
    navigationSource: point.navigationSource,
  } : {}
  return {
    id, ...descriptions[id], ...entry, ...navigation, coordinatesSource: point.coordinatesSource,
    coordinateRole: point.coordinateRole, elevation: point.elevation,
    longitude: point.coordinates[0], latitude: point.coordinates[1],
    lastVerified: verifiedDate, images: library.filter(photo => photo.id.startsWith(id + '-')),
  }
})
export const featuredSpots = ['sun','ming','linggu','palace','observatory','music','ridge']
export const spotById = Object.fromEntries(spots.map(spot => [spot.id, spot])) as Record<SpotKey, ScenicSpot>

const routeText = {
  hike: {
    name: '山林徒步', englishName: 'Up to the ridge', title: '蒋王庙登山道', start: '蒋王庙登山道口', end: '头陀岭索道站',
    description: '从北麓沿石阶登上山脊，在头陀岭打开山顶视野。',
    difficulty: '有挑战', audience: '适合能持续上坡的徒步者',
    note: '石阶较多，雨后湿滑。时间仅计上行，返程请预留步行时间或先确认索道运行。',
    source: official + '/ztzl/lcz/202404/t20240416_4210494.html', image: 'ridge-1', imageAlt: '紫金山顶俯瞰北坡林海', visits: ['ridge'],
  },
  heritage: {
    name: '历史漫游', englishName: 'The stone way', title: '明孝陵 · 石象路', start: '明孝陵 5 号门', end: '石象路西端转折处',
    description: '由五号门走进明孝陵，沿石象路细看林间石刻。',
    difficulty: '轻松', audience: '适合喜欢历史与摄影的访客',
    note: '需进明孝陵景区。步行时间未含检票与参观，按景区指引继续游览或原路返回。',
    source: attraction('mxljq'), image: 'spirit-1', imageAlt: '明孝陵神道石刻', visits: ['spirit','ming'],
  },
  easy: {
    name: '轻松半日', englishName: 'Along the greenway', title: '琵琶湖东侧 · 植物园路', start: '太平门路与植物园路交会处', end: '植物园路与植物园南路交会处',
    description: '走一段环山绿道，在中山植物园留出半日慢慢逛。',
    difficulty: '轻松', audience: '适合亲子与偏好低坡度的游客',
    note: '线路沿道路旁人行步道，路口留意车辆。植物园参观时间与门票另计。',
    source: greenway, image: 'garden-1', imageAlt: '中山植物园南园景观', visits: ['pipa','garden'],
  },
}
export type RouteKey = keyof typeof routeText
export const routes = (Object.keys(routeText) as RouteKey[]).map(id => ({
  id, ...routeText[id], ...routeGeometry[id], geometry: routeGeometry[id].geometry as Coordinate[],
}))
export type ScenicRoute = typeof routes[number]

export const travel = [
  { title: '公共交通', text: '地铁 2 号线苜蓿园、下马坊、孝陵卫和钟灵街可换乘景区接驳车。西侧索道、植物园与琵琶湖可查询沿线公交。', link: official + '/fjms/fwzn/jtxx/', label: '官方交通指南' },
  { title: '门票与预约', text: '中山陵陵寝区域实行免费预约。明孝陵、灵谷景区、音乐台和美龄宫设独立票务。开放、节假日与优惠安排请查看官方票务。', link: tickets, label: '预约与购票' },
  { title: '索道与观光车', text: '索道串联地堡城站、天文台站和头陀岭站。接驳车、观光车线路会随客流变化，末班时间请在出发前核对。', link: official + '/fjms/fwzn/ggclx/', label: '景区接驳信息' },
  { title: '入山须知', text: '请沿官方开放道路、步道和景区标识行走。雨后石阶可能湿滑，注意关门时间，并为下山和返程预留时间。', link: official + '/lyzx/', label: '最新景区公告' },
]
