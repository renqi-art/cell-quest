/* 第 5 关：Boss感染 */
const LEVEL_5 = {
  name: 'Boss感染',
  width: 80,
  cellType: 1,
  winCondition: WIN_KILL_ALL,
  sky: ['#2a0a0a','#6a0a0a'],
  map: [
      "                                                                                ",
      "                                                                                ",
      "                              o              o               o                  ",
      "               ?             ===     o      ===     D       ===                 ",
      "         o   ===       g    ==     ===     f     ===      ==                    ",
      "   o   ===       g   ===   ==    ==   C  ==      ==   g  ==                     ",
      "  ===      g     ======   ==   ==   ====  ==  o  ==  =====                      ",
      " ==  g   ========       ==   ==  ==   ==  ==  ==== ==                           ",
      "P==  ========   ==  t  ==    ==  ==  o  ==  d   ==                              ",
      "######        ==  ==== ==    ==  ========  ==  ==                               ",
      "#    #   ?    ==    == ==    ==     ==     ==                                   ",
      "#    #  ===   ==  t == ==    ==     ==  f  ==                                   ",
      "#    =======  ==  ===  ==    ==  o  ==  ====                                    ",
      "######   #    D    ==  ==    ==  ==  ==     ===============================     ",
      "#####################################b################################F###      ",
  ],
  tutorials: [
    { x:2400, useCurrent:true, body:'Boss细菌！\n只有白细胞能伤害Boss\n按E挥剑或空格踩踏攻击\n击杀Boss后门会解锁！' }
  ],
  knowledgeCards: [
    { x:1900, key:'boss', title:'终极决战', text:'前方就是细菌Boss的老巢！\n白细胞是唯一能对Boss造成伤害的免疫细胞。\n利用挥剑(E键)和踩踏进行连击，\n注意躲避Boss的攻击。\n击杀Boss后终点大门将会解锁。\n准备好迎接最终决战了吗？' }
  ],
  pipeSpawners: [
    { col:30, row:0, type:'staph', interval:360, trigger:'timer', maxSpawn:3 },
    { col:55, row:0, type:'strep', interval:420, trigger:'timer', maxSpawn:2 },
  ],
};
