# sw: Bodi pepe: pini na saa
# en: Virtual board: pins and clock
# in: 0 3 0
# in: 5 3 1
# Bodi pepe (ubao): pini 3 inawaka saa 0 ms, saa inasogea hadi 10 ms, kisha pini 4 inawaka.
leta ubao

#[wazi]
kazi kuu(hoja: Orodha<Neno>) -> Tupu {
    ubao_andika(3, kweli)
    ubao_subiri(10)
    weka a = ubao_soma(3)
    ubao_andika(4, a)
    chapisha("saa " + (ubao_saa() kama Neno) + " ms")
}
