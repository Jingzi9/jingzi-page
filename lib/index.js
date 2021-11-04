const {src,dest,parallel,series,watch}=require('gulp')
const del=require('del')
const browserSync=require('browser-sync')
const loadPlugins=require("gulp-load-plugins")
const plugins=loadPlugins()
const bs=browserSync.create()
// const {series,parallel}
const cwd=process.cwd()//cwd会返回当前命令行所在的工作目录node的模块
let config={
  //默认配置
  build:{
    src:"src",
    dist:'dist',
    temp:'temp',
    public:'public',
    paths:{
       styles:'assets/styles/*.scss',
       scripts:'assets/scripts/*.js',
       pages:'*.html',
       images:'assets/images/**',
       fonts:'assets/fonts/**'
    }
  }
}
try {
  // config=require(`${cwd}/page.config.js`)
  const loadConfig=require(`${cwd}/page.config.js`)
  config=Object.assign({},config,loadConfig)
} catch (error) {}
const clean=()=>{
     return del([config.build.dist,config.build.temp])
}
const style=()=>{
  //文件读取
  return src(config.build.paths.styles,{base:config.build.src,cwd:config.build.src})
  //样式编译任务
  .pipe(plugins.sass({outputStyle:'expanded'}))
  //文件输出
  .pipe(dest(config.build.temp))
  .pipe(bs.reload({ stream: true }))
}
const script=()=>{
  return src(config.build.paths.scripts,{base:config.build.src,cwd:config.build.src})
         .pipe(plugins.babel({presets:[require('@babel/preset-env')]}))//最简单的方式是一个字符串，会自动到项目的node_modules下去找。另一种方式是：直接去载入一个preset对象修改为require的方式先到当前文件所在的目录去找，依次网上找，到根目录找，到node_modules下有
         .pipe(dest(config.build.temp))
         .pipe(bs.reload({ stream: true }))//以流的方式推到浏览器，省去bs中的files
}
const page=()=>{
  return src(config.build.paths.pages,{base:config.build.src,cwd:config.build.src})
         .pipe(plugins.swig({data:config.data,defaults: { cache: false }}))// 防止模板缓存导致页面不能及时更新
         .pipe(dest(config.build.temp))
         .pipe(bs.reload({ stream: true }))
}

const image=()=>{
  return src(config.build.paths.images,{base:config.build.src,cwd:config.build.src})
         .pipe(plugins.imagemin())
         .pipe(dest(config.build.dist))
}
const font=()=>{
  return src(config.build.paths.fonts,{base:config.build.src,cwd:config.build.src})
         .pipe(plugins.imagemin())
         .pipe(dest(config.build.dist))
}
const extra=()=>{
  return src('**',{base:config.public,cwd:config.build.public})
         .pipe(dest(config.build.dist))
}
const useref=()=>{
  return src(config.build.paths.pages,{base:config.build.temp,cwd:config.build.temp})
         .pipe(plugins.useref({searchPath:[config.build.temp,'.']}))//searchPath去那些地方找这些注释
         // html js css,之前的文件流中文件类型只有一种现在又三种gulp-if插件用来判断文件类型
         .pipe(plugins.if(/\.js$/,plugins.uglify()))
         .pipe(plugins.if(/\.css$/,plugins.cleanCss()))
         .pipe(plugins.if(/\.html$/,plugins.htmlmin({//其他配置看文档，如：删除注释或者空属性
           collapseWhitespace: true,//折叠空白字符和换行符
           minifyCSS: true,//style标签的样式压缩
           minifyJS: true//script标签中脚本压缩
          })))//html压缩之压缩属性中的空白字符，换行符默认不压缩，需要进行特殊处理
         .pipe(dest(config.build.dist))//有可能写不进去
        //  .pipe(dest('dist'))//useref会整合注释生成新的文件，但你想对新生成的文件进行额外的操作可以在上面pipe到指定插件操作，比如压缩这些新文件
}
const serve=()=>{
  watch(config.build.paths.styles,{cwd:config.build.src},style)//（a,b）a是文件路径，b是任务
  watch(config.build.paths.scripts,{cwd:config.build.src},script)
  watch(config.build.paths.pages,{cwd:config.build.src},page)
  // watch('src/assets/images/**',image)
  // watch('src/assets/fonts/**',font)
  // watch('public/**',extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
    ],{cwd:config.build.src},bs.reload)
  watch('**',{cwd:config.build.public},bs.reload)

  bs.init({
    notify:false,//关闭服务器连接成功提示，
    port:8080,//服务器端口，
    // open:false,//是否自动打开浏览器
    // files:'dist/**',//服务器监听文件变化跟新浏览器
    server:{
      // baseDir:'dist',放到服务器的包
      baseDir:[config.build.temp,config.build.dist,config.build.public,config.build.src],//当请求过来后依次在数组中的文件寻找。如一个页面请求或者样式，脚本请求回到编译后的dist目录寻找，图片请求，在开发阶段在dist目录或者src都无差别，public同理，可减少任务构建
      routes:{//用于处理对于node_modules网页请求指到同一个目录，优先于baseDir,先找这个目录再找baseDir
        '/node_modules':'node_modules'
      }
    }
  })
}
const compile=parallel(style,script,page)//开发阶段不需要image,font
//上线之前执行的任务
const build=series(
  clean,
  parallel(
    series(compile,useref),
    image,
    font,
    extra
    )
)
const develop=series(compile,serve)
module.exports={
  build,
  clean,
  develop,
 
}